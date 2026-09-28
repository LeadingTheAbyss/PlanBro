import os
import httpx
import time
import re
from collections import deque
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import TransportOption
from models.enums import TransportType
from services.db import get_db_connection
from services.cache_logger import log_cache_event
import uuid

load_dotenv(override=True)

# Rate Limiting Queue for RailRadar (10 requests / minute burst)
_request_timestamps = deque()
MAX_REQUESTS_PER_MINUTE = 9 # Keep it at 9 to be safe

# Fallback Station Cache
_fallback_station_cache: dict[str, str] = {}

# API Key Rotation State
_api_key_usage_count = 0
_current_api_key_index = 0

def get_railradar_api_key() -> Optional[str]:
    global _api_key_usage_count, _current_api_key_index
    
    keys = [
        "RAILRADAR_API_KEY", "RAILRADAR_API_KEY2", "RAILRADAR_API_KEY3",
        "RAILRADAR_API_KEY4", "RAILRADAR_API_KEY5", "RAILRADAR_API_KEY6", "RAILRADAR_API_KEY7", "RAILRADAR_API_KEY8"
    ]
    
    available_keys = [os.getenv(k) for k in keys if os.getenv(k)]
    if not available_keys:
        return None
        
    # Rotate key after 50 calls
    if _api_key_usage_count >= 50:
        _api_key_usage_count = 0
        _current_api_key_index = (_current_api_key_index + 1) % len(available_keys)
        
    if _current_api_key_index >= len(available_keys):
        _current_api_key_index = 0
        
    _api_key_usage_count += 1
    return available_keys[_current_api_key_index]

# Expanded city to station mapping for Indian Railways
CITY_TO_STATION = {
    "Delhi": "NDLS", "New Delhi": "NDLS", "DEL": "NDLS",
    "Mumbai": "CSMT", "BOM": "CSMT",
    "Bangalore": "SBC", "Bengaluru": "SBC", "BLR": "SBC",
    "Chennai": "MAS", "MAA": "MAS",
    "Kolkata": "HWH", "CCU": "HWH",
    "Lucknow": "LKO",
    "Jaipur": "JP", "JAI": "JP",
    "Agra": "AGC",
    "Varanasi": "BSB",
    "Ahmedabad": "ADI", "AMD": "ADI",
    "Pune": "PUNE", "PNQ": "PUNE",
    "Hyderabad": "SC", "HYD": "SC",
    "Chandigarh": "CDG",
    "Amritsar": "ASR",
    "Kochi": "ERS", "Cochin": "ERS",
    "Goa": "MAO",
    "Trivandrum": "TVC",
    "Guwahati": "GHY",
    "Patna": "PNBE",
    "Bhopal": "BPL",
    "Indore": "INDB",
    "Nagpur": "NGP",
    "Kanpur": "CNB",
    "Ludhiana": "LDH",
    "Dehradun": "DDN",
    "Ranchi": "RNC",
    "Bhubaneswar": "BBS",
    "Raipur": "R",
    "Surat": "ST",
    "Vadodara": "BRC",
    "Udaipur": "UDZ",
    "Jodhpur": "JU"
}

RAW_CSV_DATA = """
Jaipur: The Pink City of India[cite: 1],Jaipur International Airport (JAI),Jaipur Junction (JP)
Nanjangud, Mysore, Karnataka, India[cite: 1],Mysuru Airport (MYQ),Nanjangud Town (NTW)
Chittorgarh, Rajasthan, India[cite: 1],Maharana Pratap Airport (UDR),Chittaurgarh Junction (COR)
Ratnagiri, Maharashtra, India[cite: 1],Ratnagiri Airport (RTC),Ratnagiri Railway Station (RN)
Pindwara, Rajasthan, India[cite: 1],Maharana Pratap Airport (UDR),Sirohi Road (SOH)
Raipur, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Raipur Junction (R)
Gokak, Karnataka, India[cite: 1],Belagavi Airport (IXG),Gokak Road (GKK)
Lucknow, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Lucknow Charbagh (LKO)
Delhi, India[cite: 1],Indira Gandhi International Airport (DEL),New Delhi Railway Station (NDLS)
Mumbai, Maharashtra, India[cite: 1],Chhatrapati Shivaji Maharaj International Airport (BOM),Chhatrapati Shivaji Maharaj Terminus (CSMT)
Sagar, Karnataka, India[cite: 1],Shivamogga Airport (RQY),Sagara Jambagaru (SRF)
Jalpaiguri, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Jalpaiguri Road (JPE) / New Jalpaiguri (NJP)
Pakur, Jharkhand, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Pakur Railway Station (PKR)
Sardarshahar, Rajasthan, India[cite: 1],Bikaner Airport (BKB),Sardarshahr Railway Station (SRDR)
Sirohi, Rajasthan, India[cite: 1],Maharana Pratap Airport (UDR),Sirohi Road (SOH)
Jaysingpur, Maharashtra, India[cite: 1],Kolhapur Airport (KLH),Jayasingpur Railway Station (JSP)
Ramanagara, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Ramanagaram (RMGM)
Chikkaballapura, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Chikkaballapur (CBP)
Channapatna, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Channapatna (CPT)
Surendranagar, Gujarat, India[cite: 1],Rajkot International Airport (HSR),Surendranagar Junction (SUNR)
Thiruvalla, Kerala, India[cite: 1],Trivandrum International Airport (TRV),Tiruvalla (TRVL)
Ranebennur, Karnataka, India[cite: 1],Hubballi Airport (HBX),Ranibennur (RNR)
Karaikal, Puducherry, India[cite: 1],Tiruchirappalli International Airport (TRZ),Karaikal Railway Station (KIK)
Belgaum, Karnataka, India[cite: 1],Belagavi Airport (IXG),Belagavi Railway Station (BGM)
Chatrapur, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Chatrapur (CAP)
Suri, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Siuri (SURI)
Bhubaneswar, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Bhubaneswar Railway Station (BBS)
Mahuva, Gujarat, India[cite: 1],Bhavnagar Airport (BHU),Mahuva Junction (MHV)
Jagadhri, Haryana, India[cite: 1],Chandigarh International Airport (IXC),Jagadhri (now Yamunanagar-Jagadhri - YJUD)
Barh, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Barh (BARH)
Bhusawal, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Bhusaval Junction (BSL)
Alipurduar, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Alipurduar Junction (APDJ)
Kollam, Kerala, India[cite: 1],Trivandrum International Airport (TRV),Kollam Junction (QLN)
Medinipur, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Midnapore (MDN)
Patan, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Patan (PTN)
Mettur, Tamil Nadu, India[cite: 1],Salem Airport (SXV),Mettur Dam (MTDM)
Huliyar, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Arsikere Junction (ASK)
Harihar, Karnataka, India[cite: 1],Hubballi Airport (HBX),Harihar (HRR)
Rasayani, Maharashtra, India[cite: 1],Chhatrapati Shivaji Maharaj International Airport (BOM),Rasayani (RSYI)
Haringhata, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Kalyani (KYI)
Kushtagi, Karnataka, India[cite: 1],Hubballi Airport (HBX),Koppal (KPN)
Jadugora, Jharkhand, India[cite: 1],Sonari Airport (IXW),Rakha Mines (RHE)
Orai, Uttar Pradesh, India[cite: 1],Kanpur Airport (KNU),Orai (ORAI)
Surajpur, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Surajpur Road (SJQ)
Ambernath, Maharashtra, India[cite: 1],Chhatrapati Shivaji Maharaj International Airport (BOM),Ambernath (ABH)
Malerkotla, Punjab, India[cite: 1],Chandigarh International Airport (IXC),Malerkotla (MET)
Jorapokhar, Jharkhand, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Dhanbad Junction (DHN)
Vizianagaram, Andhra Pradesh, India[cite: 1],Visakhapatnam International Airport (VTZ),Vizianagaram Junction (VZM)
Durg, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Durg Junction (DURG)
Himmatnagar, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Himmatnagar Junction (HMT)
Sambhal, Uttar Pradesh, India[cite: 1],Bareilly Airport (BEK),Sambhal Hatim Sarai (SHTS)
Harnaut, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Harnaut (HRT)
Port Blair, Andaman and Nicobar Islands, India[cite: 1],Veer Savarkar International Airport (IXZ),None (Nearest mainland: Chennai Central)
Suti, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Jangipur Road (JRLE)
Banswara, Rajasthan, India[cite: 1],Maharana Pratap Airport (UDR),Ratlam Junction (RTM)
Batumi, Adjara, Georgia[cite: 1],Batumi International Airport (BUS),Batumi Railway Station
Manikchak, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Malda Town (MLDT)
Roorkee, Uttarakhand, India[cite: 1],Jolly Grant Airport (DED),Roorkee (RK)
Kavali, Andhra Pradesh, India[cite: 1],Tirupati Airport (TIR) / Vijayawada Airport,Kavali (KVZ)
Dharmavaram, Andhra Pradesh, India[cite: 1],Kempegowda International Airport (BLR),Dharmavaram Junction (DMM)
Siddipet, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Siddipet Railway Station (SIPT)
Dhanpuri, Madhya Pradesh, India[cite: 1],Jabalpur Airport (JLR),Burhar (BUH)
Chirala, Andhra Pradesh, India[cite: 1],Vijayawada International Airport (VGA),Chirala (CLX)
Markapur, Andhra Pradesh, India[cite: 1],Rajiv Gandhi International Airport (HYD),Markapur Road (MRK)
Chalakudy, Kerala, India[cite: 1],Cochin International Airport (COK),Chalakudi (CKI)
Gondal, Gujarat, India[cite: 1],Rajkot International Airport (HSR),Gondal (GDL)
Bhimavaram, Andhra Pradesh, India[cite: 1],Rajahmundry Airport (RJA),Bhimavaram Town (BVRT)
Jalgaon Jamod, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Nandura (NN)
Paltan Bazaar, Guwahati, Assam, India[cite: 1],Lokpriya Gopinath Bordoloi International Airport (GAU),Guwahati Railway Station (GHY)
Hodal, Haryana, India[cite: 1],Indira Gandhi International Airport (DEL),Hodal (HDL)
Ausa, Maharashtra, India[cite: 1],Latur Airport (LTU),Latur Railway Station (LUR)
Mahidpur, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Mahidpur Road (MEP)
Gurdaspur, Punjab, India[cite: 1],Sri Guru Ram Dass Jee International Airport (ATQ),Gurdaspur (GSP)
Domchanch, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Koderma Junction (KQR)
Barjora, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Durgapur (DGR)
Saint Dnyaneshwar Garden and Paithan park, Paithen, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Aurangabad (AWB)
Sinnar, Maharashtra, India[cite: 1],Nashik Airport (ISK),Nashik Road (NK)
Guntakal, Andhra Pradesh, India[cite: 1],Jindal Vijaynagar Airport (VDY),Guntakal Junction (GTL)
Lalgola, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Lalgola (LGL)
Hoshangabad, Madhya Pradesh, India[cite: 1],Raja Bhoj Airport (BHO),Narmadapuram / Hoshangabad (NDPM)
Proddatur, Andhra Pradesh, India[cite: 1],Kadapa Airport (CDP),Proddatur (PRDT)
RL Infotechh & Solutions, Durgapur, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Durgapur (DGR)
Pali, Rajasthan, India[cite: 1],Jodhpur Airport (JDH),Pali Marwar (PMY)
Palwal, Haryana, India[cite: 1],Indira Gandhi International Airport (DEL),Palwal (PWL)
Gohana, Haryana, India[cite: 1],Indira Gandhi International Airport (DEL),Gohana (GHNA)
Munger, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Munger (MGR)
Yavatmal, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Yavatmal (YTL)
Bokaro Steel City, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Bokaro Steel City (BKSC)
Jetpur, Gujarat, India[cite: 1],Rajkot International Airport (HSR),Jetpur (JTP)
Basirhat, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Basirhat (BSHT)
Konnagar, Mirpur, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Konnagar (KOG)
Ranchi, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Ranchi Junction (RNC)
Gudur, Andhra Pradesh, India[cite: 1],Tirupati Airport (TIR),Gudur Junction (GDR)
Gola Gokarannath, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Gola Gokaranath (GK)
Shikohabad, Uttar Pradesh, India[cite: 1],Agra Airport (AGR),Shikohabad Junction (SKB)
Tirumangalam, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Tirumangalam (TMQ)
Anakaputhur, Sriperumbudur, Tamil Nadu, India[cite: 1],Chennai International Airport (MAA),Pallavaram (PV)
Suryapet, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Khammam (KMT)
Udupi, Karnataka, India[cite: 1],Mangaluru International Airport (IXE),Udupi (UD)
Nandyal, Andhra Pradesh, India[cite: 1],Kurnool Airport (KJB),Nandyal (NDL)
Begusarai, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Begusarai (BGS)
Contai, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Kanthi (KATI)
Naya Raipur, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Nava Raipur (NRDP)
Payradanga, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Payradanga (PDX)
Maheshtala, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Nungi (NACC)
Vaniyambadi, Tamil Nadu, India[cite: 1],Kempegowda International Airport (BLR),Vaniyambadi (VN)
Shahdol, Madhya Pradesh, India[cite: 1],Jabalpur Airport (JLR),Shahdol (SDL)
Aruppukkottai, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Aruppukkottai (APK)
Salipur, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Cuttack (CTC)
Sasaram, Bihar, India[cite: 1],Gaya Airport (GAY),Sasaram Junction (SSM)
Mahuva, Gujarat, India[cite: 1],Bhavnagar Airport (BHU),Mahuva Junction (MHV)
Bihta, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Bihta (BTA)
Dahod, Gujarat, India[cite: 1],Vadodara Airport (BDQ),Dahod (DHD)
Najibabad, Uttar Pradesh, India[cite: 1],Dehradun Airport (DED),Najibabad Junction (NBD)
Bagaha, Bihar, India[cite: 1],Gorakhpur Airport (GOP),Bagaha (BUG)
Jamalpur, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Jamalpur Junction (JMP)
Fatehpur, Uttar Pradesh, India[cite: 1],Kanpur Airport (KNU),Fatehpur (FTP)
Dindigul, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Dindigul Junction (DG)
Chakradharpur, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Chakradharpur (CKP)
Porbandar, Gujarat, India[cite: 1],Porbandar Airport (PBD),Porbandar (PBR)
Ghatal, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Panskura (PKU)
Khidirpur, Kolkata, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Kidderpore (KIRP)
Mandya, Karnataka, India[cite: 1],Mysuru Airport (MYQ),Mandya (MYA)
Dahanu, Maharashtra, India[cite: 1],Chhatrapati Shivaji Maharaj International Airport (BOM),Dahanu Road (DRD)
Sri Muktsar Sahib, Punjab, India[cite: 1],Sri Guru Ram Dass Jee International Airport (ATQ),Muktsar (MKS)
Kanchipuram, Tamil Nadu, India[cite: 1],Chennai International Airport (MAA),Kanchipuram (CJ)
Dhanpur, Gujarat, India[cite: 1],Vadodara Airport (BDQ),Dahod (DHD)
Bengaluru, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),KSR Bengaluru (SBC)
Muzaffarnagar, Uttar Pradesh, India[cite: 1],Jolly Grant Airport (DED),Muzaffarnagar (MOZ)
Chhatarpur, Madhya Pradesh, India[cite: 1],Khajuraho Airport (HJR),Maharaja Chhatrasal Station Chhatarpur (MCSC)
Bongaigaon, Assam, India[cite: 1],Lokpriya Gopinath Bordoloi International Airport (GAU),New Bongaigaon (NBQ)
RAK Tiles, Ner Chowk, Himachal Pradesh, India[cite: 1],Bhuntar Airport (KUU),Una Himachal (UHL)
Nilanga, Maharashtra, India[cite: 1],Latur Airport (LTU),Latur Railway Station (LUR)
Amreli, Gujarat, India[cite: 1],Rajkot International Airport (HSR),Amreli (AE)
Bulandshahar, Uttar Pradesh, India[cite: 1],Indira Gandhi International Airport (DEL),Bulandshahr (BSC)
Kharagpur, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Kharagpur Junction (KGP)
Arrah, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Ara Junction (ARA)
Fatehpur, Rajasthan, India[cite: 1],Jaipur International Airport (JAI),Fatehpur Shekhawati (FPS)
Seoni, Madhya Pradesh, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Seoni (SEY)
Siliguri, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),New Jalpaiguri (NJP)
Mangaluru, Karnataka, India[cite: 1],Mangaluru International Airport (IXE),Mangaluru Central (MAQ)
Kandi, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Khagraghat Road (KGLE)
Khammam, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Khammam (KMT)
Morshi, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Amravati (AMI)
Vijaypur, Jammu and Kashmir, India[cite: 1],Jammu Airport (IXJ),Vijaypur Jammu (VJPJ)
Santha, Uttar Pradesh, India[cite: 1],Gorakhpur Airport (GOP),Khalilabad (KLD)
Chalisgaon, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Chalisgaon Junction (CSN)
Etawah, Uttar Pradesh, India[cite: 1],Gwalior Airport (GWL) / Kanpur Airport,Etawah Junction (ETW)
Simlapal, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Bankura Junction (BQA)
Lakhimpur, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Lakhimpur (LMP)
Masaurhi, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Taregna (TEA)
Bhatta, Paldi, Ahmedabad, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Ahmedabad Junction (ADI)
Sultanpur, Uttar Pradesh, India[cite: 1],Ayodhya International Airport (AYJ) / Lucknow Airport,Sultanpur Junction (SLN)
Kotulpur, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Gokulnagar Joypur (GOK)
Pithampur, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Dr. Ambedkar Nagar (Mhow) (DADN)
Bela Pratapgarh, Uttar Pradesh, India[cite: 1],Prayagraj Airport (IXD),Pratapgarh Junction (PBH)
Ghazipur, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Ghazipur City (GCT)
Buxar, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Buxar (BXR)
Baran, Rajasthan, India[cite: 1],Kota Airport (KTU) / Jaipur Airport,Baran (BAZ)
Saideep Enterprises, Ambad Nashik, Maharashtra, India[cite: 1],Nashik Airport (ISK),Nashik Road (NK)
Hazaribagh, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Hazaribagh Town (HZBN)
Rudrapur, Uttarakhand, India[cite: 1],Pantnagar Airport (PGH),Rudrapur City (RUPC)
Success Point, Bhadravati, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Bhandak (BUX)
Balaghat, Madhya Pradesh, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Balaghat Junction (BTC)
Thodupuzha, Kerala, India[cite: 1],Cochin International Airport (COK),Aluva (AWY)
Kothagudem, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Bhadrachalam Road (BDCR)
Debra, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Balichak (BCK)
Khambhat, Gujarat, India[cite: 1],Vadodara Airport (BDQ),Khambhat (CBY)
Kalaburagi, Karnataka, India[cite: 1],Kalaburagi Airport (GBI),Kalaburagi Junction (KLBG)
Palampur, Himachal Pradesh, India[cite: 1],Kangra Airport (DHM),Palampur Himachal (PLMX)
Bargarh, Odisha, India[cite: 1],Veer Surendra Sai Airport (JRG),Bargarh Road (BRGA)
Jaunpur, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Jaunpur Junction (JNU)
Bahraich, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Bahraich (BRK)
Shegaon, Maharashtra, India[cite: 1],Akola Airport (AKD) / Aurangabad Airport,Shegaon (SEG)
Ballari, Karnataka, India[cite: 1],Jindal Vijaynagar Airport (VDY),Ballari Junction (BAY)
Hapur, Uttar Pradesh, India[cite: 1],Indira Gandhi International Airport (DEL),Hapur Junction (HPU)
Kashipur, Uttarakhand, India[cite: 1],Pantnagar Airport (PGH),Kashipur Junction (KPV)
Sikandra, Uttar Pradesh, India[cite: 1],Kanpur Airport (KNU),Pukhrayan (PHN)
Palakkad, Kerala, India[cite: 1],Coimbatore International Airport (CJB),Palakkad Junction (PGT)
Almora, Uttarakhand, India[cite: 1],Pantnagar Airport (PGH),Kathgodam (KGM)
Dhar, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Indore Junction (INDB)
Ameerpet, Hyderabad, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Nature Cure Hospital (NCH)
Georai, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Jalna (J)
Kodad, Telangana, India[cite: 1],Vijayawada International Airport (VGA),Khammam (KMT)
Kalaigaon, Assam, India[cite: 1],Lokpriya Gopinath Bordoloi International Airport (GAU),Tangla (TNL)
Newasa, Maharashtra, India[cite: 1],Shirdi Airport (SAG),Belapur (BAP)
Jalgaon, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Jalgaon Junction (JL)
Mahasamund, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Mahasamund (MSMD)
Giridih, Jharkhand, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Giridih (GRD)
Purnea, Bihar, India[cite: 1],Bagdogra International Airport (IXB),Purnia Junction (PRNA)
Kotputli, Rajasthan, India[cite: 1],Jaipur International Airport (JAI),Narnaul (NNL)
Jhalawar, Rajasthan, India[cite: 1],Kota Airport (KTU),Jhalawar City (JLWC)
Sitarganj, Uttarakhand, India[cite: 1],Pantnagar Airport (PGH),Khatima (KMA)
Barauda, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Raipur Junction (R)
Sangareddy, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Lingampalli (LPI)
Azamgarh, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Azamgarh (AMH)
Suratgarh, Rajasthan, India[cite: 1],Bikaner Airport (BKB),Suratgarh Junction (SOG)
Gingee, Tamil Nadu, India[cite: 1],Puducherry Airport (PNY),Tindivanam (TMV)
Samastipur, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Samastipur Junction (SPJ)
Ballia, Uttar Pradesh, India[cite: 1],Jayprakash Narayan International Airport (PAT),Ballia (BUI)
Jahanabad, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Jehanabad (JHD)
Kekri, Rajasthan, India[cite: 1],Kishangarh Airport (KQH),Ajmer Junction (AII)
Dholpur, Rajasthan, India[cite: 1],Agra Airport (AGR),Dholpur Junction (DHO)
Hosur, Tamil Nadu, India[cite: 1],Kempegowda International Airport (BLR),Hosur (HSRA)
Bisalpur, Uttar Pradesh, India[cite: 1],Bareilly Airport (BEK),Bisalpur (BSUR)
Jhansi, Uttar Pradesh, India[cite: 1],Gwalior Airport (GWL),VGL Jhansi Junction (VGLJ)
Korba, Chhattisgarh, India[cite: 1],Bilasa Devi Kevat Airport (PAB),Korba (KRBA)
Tadepalligudem, Andhra Pradesh, India[cite: 1],Rajahmundry Airport (RJA),Tadepalligudem (TDD)
Rajnandgaon, Chhattisgarh, India[cite: 1],Swami Vivekananda Airport (RPR),Rajnandgaon (RJN)
Gumla, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Bano (BANO)
Kuchaman City, Rajasthan, India[cite: 1],Kishangarh Airport (KQH),Kuchaman City (KMNC)
Sankari, Tamil Nadu, India[cite: 1],Salem Airport (SXV),Sankaridurg (SGE)
Forbesganj, Bihar, India[cite: 1],Bagdogra International Airport (IXB),Forbesganj Junction (FBG)
Thandalam, Tamil Nadu, India[cite: 1],Chennai International Airport (MAA),Tiruvallur (TRL)
Sahibzada Ajit Singh Nagar, Punjab, India[cite: 1],Chandigarh International Airport (IXC),SAS Nagar Mohali (SASN)
Etah, Uttar Pradesh, India[cite: 1],Agra Airport (AGR),Etah (ETAH)
Nabadwip, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Nabadwip Dham (NDAE)
Sri Ganganagar, Rajasthan, India[cite: 1],Bathinda Airport (BUP),Shri Ganganagar Junction (SGNR)
Hanamkonda, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Kazipet Junction (KZJ)
Ramagundam, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Ramagundam (RDM)
Mau, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Mau Junction (MAU)
Gangakhed, Maharashtra, India[cite: 1],Nanded Airport (NDC),Gangakher (GNH)
Rahon, Punjab, India[cite: 1],Sahnewal Airport (LUH) / Chandigarh Airport,Nawanshahr Doaba (NSS)
Mansa, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Gandhinagar Capital (GNC)
Narwana, Haryana, India[cite: 1],Chandigarh International Airport (IXC),Narwana Junction (NRW)
Pulivendula, Andhra Pradesh, India[cite: 1],Kadapa Airport (CDP),Muddanuru (MOO)
Brahmapur, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Brahmapur (BAM)
Kadayanallur, Tamil Nadu, India[cite: 1],Trivandrum International Airport (TRV),Kadayanallur (KDNL)
Bathinda, Punjab, India[cite: 1],Bathinda Airport (BUP),Bathinda Junction (BTI)
Botad, Gujarat, India[cite: 1],Bhavnagar Airport (BHU),Botad Junction (BTD)
Darjeeling, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Darjeeling (DJ)
Chiplun, Maharashtra, India[cite: 1],Ratnagiri Airport (RTC) / Pune Airport,Chiplun (CHI)
Haldwani, Uttarakhand, India[cite: 1],Pantnagar Airport (PGH),Haldwani (HDW)
Cuddalore, Tamil Nadu, India[cite: 1],Puducherry Airport (PNY),Cuddalore Port Junction (CUPJ)
Bharuch, Gujarat, India[cite: 1],Surat International Airport (STV),Bharuch Junction (BH)
Bhadohi, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Bhadohi (BOY)
Vaijapur, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Rotegaon (RGO)
Vadakara, Kerala, India[cite: 1],Kannur International Airport (CNN),Vadakara (BDJ)
Sitamarhi, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Sitamarhi Junction (SMI)
Rajgir, Bihar, India[cite: 1],Gaya Airport (GAY),Rajgir (RGD)
Shimoga, Karnataka, India[cite: 1],Shivamogga Airport (RQY),Shivamogga Town (SMET)
Unnao, Uttar Pradesh, India[cite: 1],Kanpur Airport (KNU),Unnao Junction (ON)
Rangia, Assam, India[cite: 1],Lokpriya Gopinath Bordoloi International Airport (GAU),Rangiya Junction (RNY)
Chandrapur, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Chandrapur (CD)
Silchar, Assam, India[cite: 1],Silchar Airport (IXS),Silchar (SCL)
Hailakandi, Assam, India[cite: 1],Silchar Airport (IXS),Hailakandi (HKD)
Aizawl, Mizoram, India[cite: 1],Lengpui Airport (AJL),Bairabi (BHRB)
South Dum Dum, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Dum Dum Junction (DDJ)
Kavathe Mahankal, Maharashtra, India[cite: 1],Kolhapur Airport (KLH),Kavathe Mahankal (KVK)
Davanagere, Karnataka, India[cite: 1],Hubballi Airport (HBX),Davangere (DVG)
Mhow, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Dr. Ambedkar Nagar (Mhow) (DADN)
Moga, Punjab, India[cite: 1],Sri Guru Ram Dass Jee International Airport (ATQ),Moga (MOGA)
Bhatpara, Kolkata, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Shyamnagar (SNR)
Batala, Punjab, India[cite: 1],Sri Guru Ram Dass Jee International Airport (ATQ),Batala Junction (BAT)
Farrukhabad, Uttar Pradesh, India[cite: 1],Kanpur Airport (KNU),Farrukhabad Junction (FBD)
Nohar, Rajasthan, India[cite: 1],Bikaner Airport (BKB),Nohar (NHR)
Jharia, Jharkhand, India[cite: 1],Birsa Munda Airport (IXR),Dhanbad Junction (DHN)
Hoshiarpur, Punjab, India[cite: 1],Adampur Airport (AIP),Hoshiarpur (HSX)
Balurghat, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Balurghat (BLGT)
Madhubani, Bihar, India[cite: 1],Darbhanga Airport (DBR),Madhubani (MBI)
Khurai, Madhya Pradesh, India[cite: 1],Raja Bhoj Airport (BHO),Khurai (KYE)
Upleta, Gujarat, India[cite: 1],Porbandar Airport (PBD),Upleta (UA)
Saharanpur, Uttar Pradesh, India[cite: 1],Jolly Grant Airport (DED),Saharanpur Junction (SRE)
Ghaziabad, Uttar Pradesh, India[cite: 1],Indira Gandhi International Airport (DEL),Ghaziabad Junction (GZB)
Sambalpur, Odisha, India[cite: 1],Veer Surendra Sai Airport (JRG),Sambalpur Junction (SBP)
Saharsa, Bihar, India[cite: 1],Darbhanga Airport (DBR),Saharsa Junction (SHC)
Gohpur, Assam, India[cite: 1],Lilabari Airport (IXI),Gohpur (GPZ)
Jamalpur, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Masagram Junction (GMMG)
Narsapur, Andhra Pradesh, India[cite: 1],Rajahmundry Airport (RJA),Narasapur (NS)
Malappuram, Kerala, India[cite: 1],Calicut International Airport (CCJ),Tirur (TIR)
Gauribidanur, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Gauribidanur (GBD)
Dibrugarh, Assam, India[cite: 1],Dibrugarh Airport (DIB),Dibrugarh (DBRG)
Gangtok, Sikkim, India[cite: 1],Pakyong Airport (PYG),New Jalpaiguri (NJP)
Balotra, Rajasthan, India[cite: 1],Jodhpur Airport (JDH),Balotra (BLT)
Narsampet, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Warangal (WL)
Kozhikode, Kerala, India[cite: 1],Calicut International Airport (CCJ),Kozhikode Main (CLT)
Hindaun City, Rajasthan, India[cite: 1],Agra Airport (AGR),Hindaun City (HAN)
Kumbakonam, Tamil Nadu, India[cite: 1],Tiruchirappalli International Airport (TRZ),Kumbakonam (KMU)
Satna, Madhya Pradesh, India[cite: 1],Khajuraho Airport (HJR),Satna Junction (STA)
Chhindwara, Madhya Pradesh, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Chhindwara Junction (CWA)
Ongole, Andhra Pradesh, India[cite: 1],Vijayawada International Airport (VGA),Ongole (OGL)
Padrauna, Uttar Pradesh, India[cite: 1],Gorakhpur Airport (GOP),Padrauna (POU)
Akola, Maharashtra, India[cite: 1],Akola Airport (AKD),Akola Junction (AK)
Kalwan, Maharashtra, India[cite: 1],Nashik Airport (ISK),Manmad Junction (MMR)
Sircilla, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Kamareddi (KMC)
Rohtak, Haryana, India[cite: 1],Indira Gandhi International Airport (DEL),Rohtak Junction (ROK)
Anandapur, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Jajpur Keonjhar Road (JJKR)
DCKAP Technologies, Anna Nagar, Chennai, Tamil Nadu, India[cite: 1],Chennai International Airport (MAA),Chennai Central (MAS)
Garhshankar, Punjab, India[cite: 1],Chandigarh International Airport (IXC),Garhshankar (GSR)
Jagtial, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Jagityal Lingampet (JRL)
Dausa, Rajasthan, India[cite: 1],Jaipur International Airport (JAI),Dausa (DO)
Muradnagar, Uttar Pradesh, India[cite: 1],Indira Gandhi International Airport (DEL),Muradnagar (MUD)
Srivilliputhur, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Srivilliputtur (SVPR)
Paramakudi, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Paramakkudi (PMK)
Barabanki, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Barabanki Junction (BBK)
Secunderabad, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Secunderabad Junction (SC)
Mirzapur, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Mirzapur (MZP)
Virudhachalam, Tamil Nadu, India[cite: 1],Tiruchirappalli International Airport (TRZ),Vriddhachalam Junction (VRI)
Jhunjhunu, Rajasthan, India[cite: 1],Jaipur International Airport (JAI),Jhunjhunun (JJN)
Karera, Madhya Pradesh, India[cite: 1],Gwalior Airport (GWL),Karera (KRA)
Kottayam, Kerala, India[cite: 1],Cochin International Airport (COK),Kottayam (KTYM)
Shivpuri, Madhya Pradesh, India[cite: 1],Gwalior Airport (GWL),Shivpuri (SVPI)
Amalner, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Amalner (AN)
Durgapur, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Durgapur (DGR)
Dharwad, Karnataka, India[cite: 1],Hubballi Airport (HBX),Dharwad (DWR)
Vapi, Gujarat, India[cite: 1],Surat International Airport (STV),Vapi (VAPI)
Firozabad, Uttar Pradesh, India[cite: 1],Agra Airport (AGR),Firozabad (FZD)
Vasco da Gama, Goa, India[cite: 1],Dabolim Airport (GOI),Vasco-da-Gama (VSG)
Asansol, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Asansol Junction (ASN)
Tenkasi, Tamil Nadu, India[cite: 1],Trivandrum International Airport (TRV),Tenkasi Junction (TSI)
Srikakulam, Andhra Pradesh, India[cite: 1],Visakhapatnam International Airport (VTZ),Srikakulam Road (CHE)
Hassan, Karnataka, India[cite: 1],Mangaluru International Airport (IXE),Hassan Junction (HAS)
Churu, Rajasthan, India[cite: 1],Jaipur International Airport (JAI),Churu Junction (CUR)
Hinganghat, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Hinganghat (HGT)
Lakhisarai, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Kiul Junction (KIUL)
Mahoba, Uttar Pradesh, India[cite: 1],Khajuraho Airport (HJR),Mahoba Junction (MBA)
Sirsa, Haryana, India[cite: 1],Bhatinda Airport (BUP),Sirsa (SSA)
Ranaghat, West Bengal, India[cite: 1],Netaji Subhash Chandra Bose International Airport (CCU),Ranaghat Junction (RHA)
Udgir, Maharashtra, India[cite: 1],Latur Airport (LTU),Udgir (UDGR)
Ratlam, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Ratlam Junction (RTM)
Nimbahera, Rajasthan, India[cite: 1],Maharana Pratap Airport (UDR),Nimbahera (NBH)
Robertsganj, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Robertsganj (RBGJ)
Khandwa, Madhya Pradesh, India[cite: 1],Devi Ahilya Bai Holkar Airport (IDR),Khandwa Junction (KNW)
Rajendra Nagar, Cuttack, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Cuttack (CTC)
Mehsana, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Mahesana Junction (MSH)
Fatehabad, Haryana, India[cite: 1],Hisar Airport (HSS),Bhattu (BHT)
Raiganj, West Bengal, India[cite: 1],Bagdogra International Airport (IXB),Raiganj (RGJ)
Junnar, Maharashtra, India[cite: 1],Pune International Airport (PNQ),Pune Junction (PUNE)
Unchahar, Uttar Pradesh, India[cite: 1],Prayagraj Airport (IXD),Unchahar Junction (UCR)
Banka, Bihar, India[cite: 1],Deoghar Airport (DGH),Banka (BAKA)
Jamner, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Jamner (JMNR)
Khamgaon, Maharashtra, India[cite: 1],Akola Airport (AKD),Khamgaon (KMN)
Mehkar, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Malkapur (MKU)
Rewa, Madhya Pradesh, India[cite: 1],Prayagraj Airport (IXD),Rewa (REWA)
Karnal, Haryana, India[cite: 1],Chandigarh International Airport (IXC),Karnal (KUN)
Ichalkaranji, Maharashtra, India[cite: 1],Kolhapur Airport (KLH),Hatkanagale (HTK)
Bihar Sharif, Bihar, India[cite: 1],Jayprakash Narayan International Airport (PAT),Bihar Sharif Junction (BEHS)
Cooch Behar, West Bengal, India[cite: 1],Cooch Behar Airport (COH),New Cooch Behar (NCB)
Imphal, Manipur, India[cite: 1],Bir Tikendrajit International Airport (IMF),Dimapur (DMV) / Khongsang
Viramgam, Gujarat, India[cite: 1],Sardar Vallabhbhai Patel International Airport (AMD),Viramgam Junction (VG)
Anantnag, Jammu and Kashmir, India[cite: 1],Srinagar Airport (SXR),Anantnag (ANT)
Panaji, Goa, India[cite: 1],Dabolim Airport (GOI),Karmali (KRMI)
Anand, Gujarat, India[cite: 1],Vadodara Airport (BDQ),Anand Junction (ANND)
Manmad, Maharashtra, India[cite: 1],Nashik Airport (ISK),Manmad Junction (MMR)
Daryapur, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Banosa (BASA)
Arvi, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Pulgaon Junction (PLO)
Paratwada, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Amravati (AMI)
Bardoli, Gujarat, India[cite: 1],Surat International Airport (STV),Bardoli (BIY)
Bodhgaya, Bihar, India[cite: 1],Gaya Airport (GAY),Gaya Junction (GAYA)
Chabua, Assam, India[cite: 1],Dibrugarh Airport (DIB),Chabua (CHB)
Jamkhandi, Karnataka, India[cite: 1],Belagavi Airport (IXG),Bagalkot (BGK)
Burdwan, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Barddhaman Junction (BWN)
Tumakuru, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Tumakuru (TK)
Nayagarh, Odisha, India[cite: 1],Biju Patnaik International Airport (BBI),Nayagarh Town (NYGT)
Sivasagar, Assam, India[cite: 1],Jorhat Airport (JRH),Sibsagar Town (SRTN)
Wani, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Wani (WANI)
Karwar, Karnataka, India[cite: 1],Dabolim Airport (GOI),Karwar (KAWR)
Kapurthala, Punjab, India[cite: 1],Sri Guru Ram Dass Jee International Airport (ATQ),Kapurthala (KXH)
Ganderbal, Jammu and Kashmir, India[cite: 1],Srinagar Airport (SXR),Srinagar (SINA)
Guna, Madhya Pradesh, India[cite: 1],Raja Bhoj Airport (BHO),Guna Junction (GUNA)
Khanna, Punjab, India[cite: 1],Chandigarh International Airport (IXC),Khanna (KNN)
Mahbubnagar, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Mahbubnagar (MBNR)
Nalgonda, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Nalgonda (NLDA)
Theni, Tamil Nadu, India[cite: 1],Madurai Airport (IXM),Theni (TENI)
Eluru, Andhra Pradesh, India[cite: 1],Vijayawada International Airport (VGA),Eluru (EE)
Pusad, Maharashtra, India[cite: 1],Nanded Airport (NDC),Washim (WHM)
Shamshabad, Telangana, India[cite: 1],Rajiv Gandhi International Airport (HYD),Umdanagar (UR)
Aurangabad, Maharashtra, India[cite: 1],Aurangabad Airport (IXU),Aurangabad (AWB)
Bankura, West Bengal, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Bankura Junction (BQA)
Renukoot, Uttar Pradesh, India[cite: 1],Lal Bahadur Shastri International Airport (VNS),Renukut (RNQ)
Anakapalle, Andhra Pradesh, India[cite: 1],Visakhapatnam International Airport (VTZ),Anakapalle (AKP)
Sikandrabad, Uttar Pradesh, India[cite: 1],Indira Gandhi International Airport (DEL),Sikandarpur (SKQ)
Saidabad, New Delhi, Delhi, India[cite: 1],Indira Gandhi International Airport (DEL),New Delhi (NDLS)
Yelahanka, Bengaluru, Karnataka, India[cite: 1],Kempegowda International Airport (BLR),Yelahanka Junction (YNK)
Pithoragarh, Uttarakhand, India[cite: 1],Naini Saini Airport (NNS),Tanakpur (TPU)
Vidisha, Madhya Pradesh, India[cite: 1],Raja Bhoj Airport (BHO),Vidisha (BHS)
Warora, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Warora (WRR)
Jhagadia, Gujarat, India[cite: 1],Surat International Airport (STV),Jhagadiya Junction (JGI)
Morbi, Gujarat, India[cite: 1],Rajkot International Airport (HSR),Morbi (MVI)
Bhopal: The Capital of Madhya Pradesh[cite: 1],Raja Bhoj Airport (BHO),Bhopal Junction (BPL)
Agartala, Tripura, India[cite: 1],Maharaja Bir Bikram Airport (IXA),Agartala (AGTL)
Bhandara, Maharashtra, India[cite: 1],Dr. Babasaheb Ambedkar International Airport (NAG),Bhandara Road (BRD)
Baramati, Maharashtra, India[cite: 1],Pune International Airport (PNQ),Baramati (BRMT)
Makrana, Rajasthan, India[cite: 1],Kishangarh Airport (KQH),Makrana Junction (MKN)
Panipat, Haryana, India[cite: 1],Indira Gandhi International Airport (DEL),Panipat Junction (PNP)
Sehore, Madhya Pradesh, India[cite: 1],Raja Bhoj Airport (BHO),Sehore (SEH)
Madanapalle, Andhra Pradesh, India[cite: 1],Kempegowda International Airport (BLR),Madanapalle Road (MPL)
Madhopur, Punjab, India[cite: 1],Pathankot Airport (IXP),Madhopur Punjab (MDPB)
Bhuj, Gujarat, India[cite: 1],Bhuj Airport (BHJ),Bhuj (BHUJ)
Shahjahanpur, Uttar Pradesh, India[cite: 1],Bareilly Airport (BEK),Shahjahanpur (SPN)
Raebareli, Uttar Pradesh, India[cite: 1],Chaudhary Charan Singh International Airport (LKO),Rae Bareli Junction (RBL)
Dhanbad, Jharkhand, India[cite: 1],Kazi Nazrul Islam Airport (RDP),Dhanbad Junction (DHN)
Hasanpur, Uttar Pradesh, India[cite: 1],Bareilly Airport (BEK),Gajraula Junction (GJL)
Jabalpur, Madhya Pradesh, India[cite: 1],Jabalpur Airport (JLR),Jabalpur Junction (JBP)
Shahada, Maharashtra, India[cite: 1],Jalgaon Airport (JLG),Dondaicha (DDE)
Mysuru, Karnataka, India[cite: 1],Mysuru Airport (MYQ),Mysuru Junction (MYS)
"""
import re
for line in RAW_CSV_DATA.strip().split('\n'):
    parts = line.split(',')
    if len(parts) >= 3:
        station_full = parts[-1].strip()
        match = re.search(r'\(([A-Z]+)\)', station_full)
        if match:
            code = match.group(1).upper()
            city_part = ",".join(parts[:-2]).strip()
            city_name = re.sub(r'\[cite:.*?\]', '', city_part).split(',')[0].split(':')[0].strip().title()
            if city_name not in CITY_TO_STATION:
                CITY_TO_STATION[city_name] = code

# Clustered stations for major cities to fetch more trains

STATION_CLUSTERS = {
    "Delhi": ["NDLS", "ANVT", "DLI"],
    "New Delhi": ["NDLS", "ANVT", "DLI"],
    "Lucknow": ["LKO", "LJN"],
    "Jaipur": ["JP", "JAI"]
}

async def get_station_code(city_name: str) -> str:
    # First check our fast-path dict
    if city_name in CITY_TO_STATION:
        return CITY_TO_STATION[city_name]
        
    # Attempt dynamic lookup using the Datameet stations JSON
    import json
    import os
    
    stations_file = os.path.join("data", "stations.json")
    
    # Download if not exists
    if not os.path.exists(stations_file):
        try:
            print(f"Downloading stations database for dynamic lookup...")
            async with httpx.AsyncClient() as client:
                res = await client.get("https://raw.githubusercontent.com/datameet/railways/master/stations.json", timeout=10.0)
                res.raise_for_status()
            os.makedirs("data", exist_ok=True)
            with open(stations_file, 'w', encoding='utf-8') as f:
                f.write(res.text)
        except Exception as e:
            print(f"[Warning] Failed to fetch stations JSON: {e}")
            return None
            
    # Load and search
    try:
        with open(stations_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        features = data.get("features", [])
        city_lower = city_name.lower()
        
        for feature in features:
            props = feature.get("properties", {})
            if not props: continue
            name = (props.get("name") or "").lower()
            code = props.get("code")
            
            # If exact match or city name is prominently in the station name
            if city_lower == name or city_lower + " jn" == name or city_lower + " cant" == name:
                return code
                
            # If address contains the city
            address = (props.get("address") or "").lower()
            if city_lower in address and code:
                # We can return the first match
                return code
                
    except Exception as e:
        print(f"[Warning] Error parsing stations JSON: {e}")
        
    return None

import urllib.parse
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def get_city_coords(city_name: str) -> dict:
    """Dynamically fetch coordinates using Open-Meteo API, fallback to Nominatim."""
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(city_name)}&count=15&format=json"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if "results" in data:
                    for r in data["results"]:
                        if r.get("country") == "India":
                            return {"lat": float(r["latitude"]), "lng": float(r["longitude"])}
    except Exception as e:
        print(f"[Warning] Open-Meteo geocoding failed: {e}")
        
    # Fallback to Nominatim
    encoded_query = urllib.parse.quote(f"{city_name}, India")
    url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&limit=1"
    headers = {"User-Agent": "BrewPlansTravelApp/1.0 (contact@brewplans.com)"}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
    except Exception as e:
        print(f"[Warning] Failed to geocode {city_name}: {e}")
    return {}

async def get_nearest_stations(lat: float, lon: float, limit: int = 3) -> List[dict]:
    import json
    import os
    stations_file = os.path.join("data", "stations.json")
    if not os.path.exists(stations_file):
        return []
        
    stations = []
    try:
        with open(stations_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for feature in data.get("features", []):
                geom = feature.get("geometry", {})
                props = feature.get("properties", {})
                if geom and geom.get("type") == "Point":
                    coords = geom.get("coordinates")
                    if coords and len(coords) == 2:
                        s_lon, s_lat = coords
                        dist = haversine(lat, lon, s_lat, s_lon)
                        if props.get("code"):
                            stations.append({
                                "code": props.get("code"),
                                "name": props.get("name"),
                                "lat": s_lat,
                                "lng": s_lon,
                                "distance_km": dist
                            })
    except Exception as e:
        print(f"[Warning] Error finding nearest stations: {e}")
        
    stations.sort(key=lambda x: x["distance_km"])
    return stations[:limit]

async def get_nearest_station(lat: float, lon: float) -> dict:
    stations = await get_nearest_stations(lat, lon, limit=1)
    return stations[0] if stations else None


async def search_gtfs_trains(origin_code: str, dest_code: str, date: str) -> List[TransportOption]:
    try:
        conn = await get_db_connection()
        req_date = datetime.strptime(date, "%Y-%m-%d")
        req_day_int = req_date.weekday() # Monday=0, Sunday=6
        
        # Check GTFS offline schema
        query = '''
            SELECT t.trip_id, r.long_name, st1.departure_time, st2.arrival_time, st2.day_offset,
                   c.monday, c.tuesday, c.wednesday, c.thursday, c.friday, c.saturday, c.sunday
            FROM "TransitTrip" t
            JOIN "TransitRoute" r ON t.route_id = r.route_id
            JOIN "TransitCalendar" c ON t.service_id = c.service_id
            JOIN "TransitStopTime" st1 ON t.trip_id = st1.trip_id
            JOIN "TransitStopTime" st2 ON t.trip_id = st2.trip_id
            WHERE st1.stop_id = $1 AND st2.stop_id = $2 
            AND st1.stop_sequence < st2.stop_sequence
        '''
        gtfs_rows = await conn.fetch(query, origin_code, dest_code)
        await conn.close()
        
        if not gtfs_rows: return []
        
        options = []
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for idx, row in enumerate(gtfs_rows):
            # Calculate the exact origin day required to reach the destination on the req_day
            st1_offset = 0 # Simplifying: assuming origin_code is absolute origin for now, or just use 0.
            origin_day_idx = (req_day_int - 0) % 7 
            origin_day_col = days[origin_day_idx]
            
            if row[origin_day_col]:
                dep_hr, dep_min = map(int, row['departure_time'].split(':'))
                arr_hr, arr_min = map(int, row['arrival_time'].split(':'))
                
                dep_time = req_date.replace(hour=dep_hr, minute=dep_min)
                
                arr_time = req_date.replace(hour=arr_hr, minute=arr_min)
                st2_offset = int(row['day_offset'] or 0)
                if st2_offset > 0:
                    arr_time += timedelta(days=st2_offset)
                elif arr_time < dep_time:
                    arr_time += timedelta(days=1)
                    
                duration_hours = (arr_time - dep_time).total_seconds() / 3600.0
                price = round(500 + (duration_hours * 80))
                
                options.append(TransportOption(
                    id=f"tr_gtfs_{idx}",
                    type=TransportType.TRAIN,
                    departure=dep_time,
                    arrival=arr_time,
                    duration_hours=round(duration_hours, 1),
                    price=float(price),
                    safety_score=8,
                    comfort_score=7,
                    provider=f"{row['long_name']} (Board: {origin_code}, Drop: {dest_code})"
                ))
        return options
    except Exception as e:
        print(f"GTFS Query failed: {e}")
        return []

def get_station_coords_sync(code: str) -> dict:
    import json, os
    stations_file = os.path.join("data", "stations.json")
    if not os.path.exists(stations_file): return {}
    with open(stations_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for feature in data.get("features", []):
            if feature.get("properties", {}).get("code") == code:
                coords = feature.get("geometry", {}).get("coordinates")
                if coords:
                    return {"lat": coords[1], "lng": coords[0], "name": feature["properties"].get("name", code)}
    return {}

async def search_live_trains(origin: str, destination: str, date: str, check_only: bool = False) -> Optional[List[TransportOption]]:
    """Fetches trains from offline GTFS DB first, then falls back to live RailRadar API."""
    
    # Strip any states from formatted names (e.g. "Lucknow, Uttar Pradesh" -> "Lucknow")
    clean_origin = re.sub(r'[^a-zA-Z0-9\s]', '', origin).strip()
    clean_dest = re.sub(r'[^a-zA-Z0-9\s]', '', destination).strip()

    major_railheads = {
        "leh": ["JAT", "SVDK", "CDG"],
        "ladakh": ["JAT", "SVDK", "CDG"],
        "srinagar": ["SVDK", "JAT", "UHP"],
        "manali": ["CDG", "UMB"],
        "gangtok": ["NJP"],
        "darjeeling": ["NJP"],
        "shimla": ["KLK", "CDG"],
        "ooty": ["CBE"],
        "munnar": ["AWY", "ERN"],
        "mcleodganj": ["PTK", "PTKC"],
        "dharamshala": ["PTK", "PTKC"],
        "spiti": ["CDG", "SML"]
    }

    if check_only:
        return None
    
    if clean_origin.lower() in major_railheads:
        origin_candidates = []
        for c in major_railheads[clean_origin.lower()]:
            c_data = get_station_coords_sync(c)
            origin_candidates.append({"code": c, "name": c_data.get("name", c), "lat": c_data.get("lat", 0), "lng": c_data.get("lng", 0)})
    else:
        origin_code = await get_station_code(clean_origin)
        origin_candidates = [{"code": origin_code, "name": origin}] if origin_code else []

    if clean_dest.lower() in major_railheads:
        dest_candidates = []
        for c in major_railheads[clean_dest.lower()]:
            c_data = get_station_coords_sync(c)
            dest_candidates.append({"code": c, "name": c_data.get("name", c), "lat": c_data.get("lat", 0), "lng": c_data.get("lng", 0)})
    else:
        dest_code = await get_station_code(clean_dest)
        dest_candidates = [{"code": dest_code, "name": destination}] if dest_code else []

    nearest_origin = None
    nearest_dest = None
    
    if not origin_candidates:
        cache_key = clean_origin.lower()
        if cache_key in _fallback_station_cache:
            origin_candidates = [{"code": _fallback_station_cache[cache_key], "from_cache": True}]
        else:
            o_coords = await get_city_coords(clean_origin)
            if o_coords:
                nearest_origins = await get_nearest_stations(o_coords["lat"], o_coords["lng"], limit=3)
                if nearest_origins:
                    origin_candidates = nearest_origins
                
    if not dest_candidates:
        cache_key = clean_dest.lower()
        if cache_key in _fallback_station_cache:
            dest_candidates = [{"code": _fallback_station_cache[cache_key], "from_cache": True}]
        else:
            d_coords = await get_city_coords(clean_dest)
            if d_coords:
                nearest_dests = await get_nearest_stations(d_coords["lat"], d_coords["lng"], limit=3)
                if nearest_dests:
                    dest_candidates = nearest_dests
                    
    if not origin_candidates or not dest_candidates:
        print(f"[Warning] Could not resolve station codes for {clean_origin} -> {clean_dest}")
        return []

    api_key = get_railradar_api_key()
    options = []
    seen_trains = set()
    
    for o_cand in origin_candidates:
        for d_cand in dest_candidates:
            o_code = o_cand["code"]
            d_code = d_cand["code"]
            
            # 1. Try GTFS Offline Database first
            gtfs_results = await search_gtfs_trains(o_code, d_code, date)
            if gtfs_results:
                print(f"[GTFS] Successfully served trains from local offline DB for {o_code}-{d_code}!")
                options.extend(gtfs_results)
                
            # 2. Try DB Cache (Legacy DOW Pattern Matching)
            if not options:
                try:
                    conn = await get_db_connection()
                    rows = await conn.fetch('SELECT train_num, train_name, dep_time, arr_time, duration_hours, price, date FROM "Train" WHERE origin = $1 AND dest = $2', o_code, d_code)
                    await conn.close()
                    
                    if rows:
                        req_date_obj = datetime.strptime(date, "%Y-%m-%d")
                        req_dow = req_date_obj.weekday()
                        valid_cached = []
                        for r in rows:
                            r_date_obj = datetime.strptime(r['date'], "%Y-%m-%d")
                            if r_date_obj.weekday() == req_dow:
                                days_diff = (req_date_obj - r_date_obj).days
                                orig_dep = datetime.fromisoformat(r['dep_time'])
                                orig_arr = datetime.fromisoformat(r['arr_time'])
                                new_dep = orig_dep + timedelta(days=days_diff)
                                new_arr = orig_arr + timedelta(days=days_diff)
                                valid_cached.append({
                                    "train_num": r['train_num'],
                                    "train_name": r['train_name'],
                                    "dep_time": new_dep,
                                    "arr_time": new_arr,
                                    "duration_hours": float(r['duration_hours']),
                                    "price": float(r['price'])
                                })
                                
                        seen_cached = set()
                        unique_cached = []
                        for c in valid_cached:
                            if c["train_num"] not in seen_cached:
                                seen_cached.add(c["train_num"])
                                unique_cached.append(c)
                                
                        if unique_cached:
                            log_cache_event("LiveTrains", "HIT", "NeonDB", f"{o_code}-{d_code}", f"Returning {len(unique_cached)} trains via DOW pattern match")
                            print(f"[Cache Hit] Returning {len(unique_cached)} trains from DB using Day-of-Week pattern match for {o_code}-{d_code}.")
                            for idx, r in enumerate(unique_cached):
                                options.append(TransportOption(
                                    id=f"tr_{r['train_num']}_{idx}_cached",
                                    type=TransportType.TRAIN,
                                    departure=r['dep_time'],
                                    arrival=r['arr_time'],
                                    duration_hours=r['duration_hours'],
                                    price=r['price'],
                                    safety_score=8,
                                    comfort_score=7,
                                    provider=f"{r['train_name']} (Board: {o_code}, Drop: {d_code})"
                                ))
                except Exception as e:
                    log_cache_event("LiveTrains", "MISS", "NeonDB", f"{clean_origin}-{clean_dest}", str(e))
                    print(f"[Warning] Train DB cache check failed: {e}")
                    
            # 3. Fetch from RailRadar if GTFS/Cache failed
            if not options and api_key:
                origins = STATION_CLUSTERS.get(clean_origin, [o_code]) if "from_cache" not in o_cand and "lat" not in o_cand else [o_code]
                dests = STATION_CLUSTERS.get(clean_dest, [d_code]) if "from_cache" not in d_cand and "lat" not in d_cand else [d_code]
                
                combinations = []
                for o in origins:
                    for d in dests:
                        combinations.append((o, d))
                combinations = combinations[:6]
                
                for (curr_o, curr_d) in combinations:
                    current_time = time.time()
                    while _request_timestamps and current_time - _request_timestamps[0] > 60:
                        _request_timestamps.popleft()
                        
                    if len(_request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
                        print("[Warning] Rate limit exceeded (10 req/min). Stopping fetches.")
                        break
                        
                    _request_timestamps.append(current_time)
                    url = f"https://api.railradar.in/v1/trains/between/{curr_o}/{curr_d}?date={date}"
                    headers = {"Authorization": f"Bearer {api_key}"}

                    try:
                        async with httpx.AsyncClient() as client:
                            response = await client.get(url, headers=headers, timeout=15.0)
                            response.raise_for_status()
                            json_resp = response.json()
                            # if not json_resp.get("success"):
                            #     continue
                                
                            data_obj = json_resp.get("data", {})
                            train_list = data_obj if isinstance(data_obj, list) else data_obj.get("trains", [])
                            
                            for idx, train_obj in enumerate(train_list):
                                train_info = train_obj.get("train", {})
                                from_info = train_obj.get("from", {})
                                to_info = train_obj.get("to", {})
                                train_num = train_info.get("number", f"T{idx}")
                                train_name = train_info.get("name", f"Train {train_num}")
                                
                                if train_name in seen_trains:
                                    continue
                                seen_trains.add(train_name)
                                
                                if len(options) >= 20:
                                    break
                                    
                                dep_time_str = from_info.get("departure", "08:00")
                                arr_time_str = to_info.get("arrival", "20:00")
                                
                                try:
                                    base_date = datetime.strptime(date, "%Y-%m-%d")
                                    dep_hour, dep_minute = map(int, dep_time_str.split(":"))
                                    dep_time = base_date.replace(hour=dep_hour, minute=dep_minute)
                                    
                                    arr_hour, arr_minute = map(int, arr_time_str.split(":"))
                                    arr_time = base_date.replace(hour=arr_hour, minute=arr_minute)
                                    
                                    from_day = int(from_info.get("day", 1))
                                    to_day = int(to_info.get("day", 1))
                                    
                                    if to_day > from_day or arr_time < dep_time:
                                        days_diff = max(to_day - from_day, 1)
                                        arr_time += timedelta(days=days_diff)
                                        
                                    duration_hours = (arr_time - dep_time).total_seconds() / 3600.0
                                    api_duration = train_obj.get("duration")
                                    if api_duration:
                                        duration_hours = float(api_duration) / 60.0
                                except Exception:
                                    base_date = datetime.strptime(date, "%Y-%m-%d")
                                    dep_time = base_date.replace(hour=8 + idx)
                                    duration_hours = 14.0
                                    arr_time = dep_time + timedelta(hours=duration_hours)
                                
                                price = round(500 + (duration_hours * 80))
                                options.append(TransportOption(
                                    id=f"tr_{train_num}_{len(options)}",
                                    type=TransportType.TRAIN,
                                    departure=dep_time,
                                    arrival=arr_time,
                                    duration_hours=round(duration_hours, 1),
                                    price=float(price), 
                                    safety_score=8,
                                    comfort_score=7,
                                    provider=f"{train_name} (Board: {curr_o}, Drop: {curr_d})"
                                ))
                    except httpx.RequestError:
                        print(f"[Warning] RailRadar API failed for {curr_o}-{curr_d}.")
                    except Exception as e:
                        print(f"[Error] Unexpected error in RailRadar API for {curr_o}-{curr_d}: {e}")

            if options:
                # We found trains! Lock in this candidate.
                if "lat" in o_cand:
                    nearest_origin = o_cand
                    _fallback_station_cache[clean_origin.lower()] = o_code
                if "lat" in d_cand:
                    nearest_dest = d_cand
                    _fallback_station_cache[clean_dest.lower()] = d_code
                break # Stop origin candidate loop
                
        if options:
            break # Stop dest candidate loop

    if not options:
        return []

    # --- Save to DB Cache ---
    try:
        conn = await get_db_connection()
        for opt in options:
            if opt.id.endswith("_cached"): continue
            train_num = opt.id.split("_")[1] if len(opt.id.split("_")) > 1 else "UNK"
            train_id = uuid.uuid4().hex
            # Using the actual winning codes
            await conn.execute('''
                INSERT INTO "Train" (id, train_num, train_name, origin, dest, date, dep_time, arr_time, duration_hours, price)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (train_num, origin, dest, date) DO NOTHING
            ''', train_id, train_num, opt.provider, o_code, d_code, date, opt.departure.isoformat(), opt.arrival.isoformat(), opt.duration_hours, opt.price)
        await conn.close()
    except Exception as e:
        print(f"[Warning] Failed to cache trains to DB: {e}")
        
    # --- Post-Process Combo Routes ---
    if nearest_origin or nearest_dest:
        from services.osrm_cab_api import calculate_cab_fare
        
        for opt in options:
            opt.id = f"tr_combo_{opt.id.replace('tr_', '')}"
            added_duration = 0
            added_price = 0
            origin_cab_hours = 0
            
            if nearest_origin:
                # OSRM from origin to nearest station
                o_coords = await get_city_coords(clean_origin)
                fare_data = await calculate_cab_fare(o_coords["lat"], o_coords["lng"], nearest_origin["lat"], nearest_origin["lng"])
                if fare_data["status"] == "success":
                    origin_cab_hours = fare_data["duration_hours"]
                    added_duration += origin_cab_hours
                    added_price += fare_data["fares"].get("sedan", fare_data["distance_km"] * 15)
                opt.provider = f"Cab to {nearest_origin['name']} + {opt.provider}"
                
            if nearest_dest:
                # OSRM from nearest station to dest
                d_coords = await get_city_coords(clean_dest)
                fare_data = await calculate_cab_fare(nearest_dest["lat"], nearest_dest["lng"], d_coords["lat"], d_coords["lng"])
                if fare_data["status"] == "success":
                    added_duration += fare_data["duration_hours"]
                    added_price += fare_data["fares"].get("sedan", fare_data["distance_km"] * 15)
                
                train_leg = opt.provider
                if " + Cab to" in train_leg:
                    train_leg = train_leg.split(" + ")[0]
                train_leg += f" to {nearest_dest['name']}"
                opt.provider = f"{train_leg} + Cab to {clean_dest}"
                
            opt.price_breakdown = {"Train": round(opt.price, 2), "Cab": round(added_price, 2)}
            opt.duration_hours = round(opt.duration_hours + added_duration, 1)
            opt.price = round(opt.price + added_price, 2)
            opt.arrival = opt.arrival + timedelta(hours=added_duration)
            if nearest_origin and origin_cab_hours > 0:
                opt.departure = opt.departure - timedelta(hours=origin_cab_hours)
        
    return sorted(options, key=lambda x: x.price)



async def get_train_route(train_number: str):
    """Fetches the full timetable (stops) of a specific train from RailRadar."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    url = f"https://api.railradar.in/v1/trains/{train_number}"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10.0)
            return res.json()
    except Exception as e:
        return {"error": str(e)}


async def get_live_train_status(train_number: str, date: str):
    """Fetches the real-time position and delay of a running train."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    url = f"https://api.railradar.in/v1/trains/{train_number}/live?date={date}"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10.0)
            return res.json()
    except Exception as e:
        return {"error": str(e)}


async def get_station_board(station_code: str):
    """Fetches the live arrivals/departures board for a station in the next 4 hours."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    # Clean the station code if it's passed as a city name
    code = CITY_TO_STATION.get(station_code, station_code)
    
    url = f"https://api.railradar.in/v1/stations/{code}/trains"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10.0)
            return res.json()
    except Exception as e:
        return {"error": str(e)}
