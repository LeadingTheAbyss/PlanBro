import os
import json
import pdfplumber
from typing import Dict, List, Any

AIRLINE_MAP = {
    "AirIndiaLtd": "Air India",
    "AirIndiaExpress": "Air India Express",
    "AllianceAir": "Alliance Air",
    "INTERGLOBE": "IndiGo",
    "SNVAviation": "Akasa Air",
    "SpiceJet": "SpiceJet"
}

CITY_TO_IATA = {
    "AGARTALA": "IXA",
    "AGATTI": "AGX",
    "AGRA": "AGR",
    "AHMEDABAD": "AMD",
    "AIZAWL": "AJL",
    "AJMER": "KQH",
    "ALAPPUZHA": "COK",
    "ALIGARH": "DEL",
    "ALLAHABAD": "IXD",
    "ALLEPPEY": "COK",
    "AMRITSAR": "ATQ",
    "ASANSOL": "RDP",
    "AULI": "DED",
    "AURANGABAD": "IXU",
    "AYODHYA": "AYJ",
    "BADRINATH": "DED",
    "BAGDOGRA": "IXB",
    "BANARAS": "VNS",
    "BANDHAVGARH": "JLR",
    "BANGALORE": "BLR",
    "BAREILLY": "BEK",
    "BELAGAVI": "IXG",
    "BELGAUM": "IXG",
    "BENGALURU": "BLR",
    "BHARATPUR": "AGR",
    "BHAVNAGAR": "BHU",
    "BHILAI": "RPR",
    "BHOPAL": "BHO",
    "BHUBANESWAR": "BBI",
    "BHUJ": "BHJ",
    "BIKANER": "BKB",
    "BILASPUR": "PAB",
    "BODH GAYA": "GAY",
    "BOMBAY": "BOM",
    "CALCUTTA": "CCU",
    "CALICUT": "CCJ",
    "CHANDIGARH": "IXC",
    "CHENNAI": "MAA",
    "CHERRAPUNJI": "SHL",
    "CHIDAMBARAM": "PNY",
    "CHOPTA": "DED",
    "COCHIN": "COK",
    "COIMBATORE": "CJB",
    "CONOOR": "CJB",
    "COONOOR": "CJB",
    "COORG": "MYQ",
    "CORBETT": "PGH",
    "CUTTACK": "BBI",
    "DALHOUSIE": "IXP",
    "DAMAN": "STV",
    "DARBHANGA": "DBR",
    "DARJEELING": "IXB",
    "DEHRADUN": "DED",
    "DELHI": "DEL",
    "DEOGHAR": "DGH",
    "DHANBAD": "RDP",
    "DHARAMSHALA": "DHM",
    "DIBRUGARH": "DIB",
    "DIGBOI": "DIB",
    "DIMAPUR": "DMU",
    "DIU": "DIU",
    "DUDHWA": "LKO",
    "DURGAPUR": "RDP",
    "DWARKA": "JGA",
    "ELLORA": "IXU",
    "ERNAKULAM": "COK",
    "ERODE": "CJB",
    "FARIDABAD": "DEL",
    "FATEHPUR SIKRI": "AGR",
    "GANGTOK": "PYG",
    "GAYA": "GAY",
    "GHAZIABAD": "DEL",
    "GOA": "GOI",
    "GOKARNA": "GOI",
    "GOLCONDA": "HYD",
    "GORAKHPUR": "GOP",
    "GREATER NOIDA": "DEL",
    "GULBARGA": "GBI",
    "GULMARG": "SXR",
    "GURGAON": "DEL",
    "GURUGRAM": "DEL",
    "GUWAHATI": "GAU",
    "GWALIOR": "GWL",
    "HALDWANI": "PGH",
    "HAMPI": "VDY",
    "HARIDWAR": "DED",
    "HAVELOCK": "IXZ",
    "HOSPET": "VDY",
    "HUBBALLI": "HBX",
    "HUBLI": "HBX",
    "HYDERABAD": "HYD",
    "IDUKKI": "COK",
    "IMPHAL": "IMF",
    "INDORE": "IDR",
    "ITANAGAR": "HGI",
    "JABALPUR": "JLR",
    "JAIPUR": "JAI",
    "JAISALMER": "JSA",
    "JALANDHAR": "AIP",
    "JALGAON": "JLG",
    "JAMMU": "IXJ",
    "JAMNAGAR": "JGA",
    "JAMSHEDPUR": "IXW",
    "JHANSI": "GWL",
    "JHARSUGUDA": "JRG",
    "JODHPUR": "JDH",
    "JORHAT": "JRH",
    "JUNAGADH": "RAJ",
    "KABINI": "MYQ",
    "KADAPA": "CDP",
    "KAKINADA": "RJA",
    "KALABURAGI": "GBI",
    "KANCHIPURAM": "MAA",
    "KANDLA": "IXY",
    "KANGRA": "DHM",
    "KANNUR": "CNN",
    "KANPUR": "KNU",
    "KANYAKUMARI": "TRV",
    "KARGIL": "IXL",
    "KASHI": "VNS",
    "KASOL": "KUU",
    "KAZIRANGA": "JRH",
    "KEDARNATH": "DED",
    "KHAJURAHO": "HJR",
    "KHANDALA": "PNQ",
    "KHARAGPUR": "CCU",
    "KOCHI": "COK",
    "KODAIKANAL": "IXM",
    "KOLHAPUR": "KLH",
    "KOLKATA": "CCU",
    "KOLLAM": "TRV",
    "KOTA": "JAI",
    "KOVALAM": "TRV",
    "KOZHIKODE": "CCJ",
    "KULLU": "KUU",
    "KUMARAKOM": "COK",
    "KURNOOL": "KJB",
    "KURUKSHETRA": "IXC",
    "LAKSHADWEEP": "AGX",
    "LAVASA": "PNQ",
    "LEH": "IXL",
    "LONAVALA": "PNQ",
    "LUCKNOW": "LKO",
    "LUDHIANA": "LUH",
    "MADRAS": "MAA",
    "MADURAI": "IXM",
    "MAHABALESHWAR": "PNQ",
    "MAHABALIPURAM": "MAA",
    "MALPE": "IXE",
    "MANALI": "KUU",
    "MANDU": "IDR",
    "MANGALORE": "IXE",
    "MANGALURU": "IXE",
    "MANIPAL": "IXE",
    "MATHERAN": "BOM",
    "MATHURA": "AGR",
    "MCLEODGANJ": "DHM",
    "MEERUT": "DEL",
    "MOHALI": "IXC",
    "MORADABAD": "DEL",
    "MOUNT ABU": "UDR",
    "MUKTESHWAR": "PGH",
    "MUMBAI": "BOM",
    "MUNNAR": "COK",
    "MURUDESHWAR": "IXE",
    "MUSSOORIE": "DED",
    "MYSORE": "MYQ",
    "MYSURU": "MYQ",
    "NAGPUR": "NAG",
    "NAINITAL": "PGH",
    "NANDED": "NDC",
    "NASHIK": "ISK",
    "NAVI MUMBAI": "BOM",
    "NEIL ISLAND": "IXZ",
    "NEW DELHI": "DEL",
    "NOIDA": "DEL",
    "OOTY": "CJB",
    "ORCHHA": "GWL",
    "OSMANABAD": "PNQ",
    "PACHMARHI": "BHO",
    "PAHALGAM": "SXR",
    "PALAKKAD": "CJB",
    "PALAMPUR": "DHM",
    "PANAJIM": "GOI",
    "PANCHGANI": "PNQ",
    "PANIPAT": "DEL",
    "PANJIM": "GOI",
    "PANTNAGAR": "PGH",
    "PATHANKOT": "IXP",
    "PATIALA": "IXC",
    "PATNA": "PAT",
    "PELLING": "PYG",
    "PONDICHERRY": "PNY",
    "POONA": "PNQ",
    "PORBANDAR": "PBD",
    "PORT BLAIR": "IXZ",
    "PRAYAGRAJ": "IXD",
    "PUDUCHERRY": "PNY",
    "PUNE": "PNQ",
    "PURI": "BBI",
    "PUSHKAR": "KQH",
    "QUILON": "TRV",
    "RAEBARELI": "LKO",
    "RAIPUR": "RPR",
    "RAJAHMUNDRY": "RJA",
    "RAJKOT": "RAJ",
    "RAMESWARAM": "IXM",
    "RANCHI": "IXR",
    "RANIKHET": "PGH",
    "RANTHAMBORE": "JAI",
    "RAVANGLA": "PYG",
    "RISHIKESH": "DED",
    "ROHTAK": "DEL",
    "ROURKELA": "RRK",
    "SALEM": "SXV",
    "SAPUTARA": "STV",
    "SASARAM": "GAY",
    "SAWAI MADHOPUR": "JAI",
    "SHILLONG": "SHL",
    "SHIMLA": "SLV",
    "SHIRDI": "SAG",
    "SHIVAMOGGA": "RQY",
    "SILCHAR": "IXS",
    "SILIGURI": "IXB",
    "SINDHUDURG": "SDW",
    "SONMARG": "SXR",
    "SPITI": "KUU",
    "SRINAGAR": "SXR",
    "SUNDARBANS": "CCU",
    "SURAT": "STV",
    "TARKARLI": "SDW",
    "TAWANG": "TEZ",
    "TEZPUR": "TEZ",
    "THANE": "BOM",
    "THEKKADY": "IXM",
    "THIRUVANANTHAPURAM": "TRV",
    "THRISSUR": "COK",
    "TIRUCHIRAPPALLI": "TRZ",
    "TIRUNELVELI": "TRZ",
    "TIRUPATI": "TIR",
    "TRICHY": "TRZ",
    "TRIVANDRUM": "TRV",
    "TULJAPUR": "PNQ",
    "TUTICORIN": "TCR",
    "UDAIPUR": "UDR",
    "UDUPI": "IXE",
    "UJJAIN": "IDR",
    "UMARIA": "JLR",
    "VADODARA": "BDQ",
    "VAISHNO DEVI": "IXJ",
    "VARANASI": "VNS",
    "VARKALA": "TRV",
    "VELLORE": "MAA",
    "VIJAYAWADA": "VGA",
    "VISAKHAPATNAM": "VTZ",
    "VIZAG": "VTZ",
    "VRINDAVAN": "AGR",
    "WARANGAL": "HYD",
    "WAYANAD": "CNN",
    "YAMUNANAGAR": "IXC",
    "YELAGIRI": "BLR",
    "YERCAUD": "SXV",
    "ZANSKAR": "IXL",
    "ZIRO": "JRH"
}

def get_airline_name(filename: str) -> str:
    for key, name in AIRLINE_MAP.items():
        if key.lower() in filename.lower():
            return name
    return "Unknown Airline"

def parse_all_pdfs(cache_file: str = "data/parsed_flights.json") -> List[Dict[str, Any]]:
    pdf_dir = os.path.join("data", "dgca_schedules")
    if not os.path.exists(pdf_dir):
        return []

    flights_dict = {}

    for file in os.listdir(pdf_dir):
        if not file.endswith(".pdf"):
            continue
            
        airline_name = get_airline_name(file)
        pdf_path = os.path.join(pdf_dir, file)
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                current_station = None
                station_iata = None
                for page in pdf.pages:
                    table = page.extract_table()
                    if not table:
                        continue
                        
                    for row in table:
                        if not row or len(row) < 9:
                            continue
                            
                        col0 = str(row[0]).strip() if row[0] is not None else ""
                        col1 = str(row[1]).strip() if row[1] is not None else ""
                        
                        if col0 and not col1:
                            if col0 not in ["Sl. No", "Approved Summer Schedule Domestic", "Operator"]:
                                current_station = col0.upper()
                                # Clean up station name if needed (e.g. "AHMEDABAD " -> "AHMEDABAD")
                                clean_station = current_station.split('(')[0].strip()
                                station_iata = CITY_TO_IATA.get(clean_station)
                            continue
                        
                        if not station_iata:
                            continue
                            
                        flight_no = col1
                        if not flight_no or flight_no == "Flight No." or flight_no == "None":
                            continue
                            
                        freq = str(row[4]).strip() if row[4] is not None else ""
                        arr_from = str(row[5]).strip() if row[5] is not None else ""
                        arr_time = str(row[6]).strip() if row[6] is not None else ""
                        dep_to = str(row[7]).strip() if row[7] is not None else ""
                        dep_time = str(row[8]).strip() if row[8] is not None else ""
                        
                        # Arrival leg
                        if arr_from and arr_time and arr_from != "None" and arr_time != "None":
                            key = f"{flight_no}_{arr_from}_{station_iata}"
                            if key not in flights_dict:
                                flights_dict[key] = {"flight_no": flight_no, "origin": arr_from, "dest": station_iata, "airline": airline_name, "freq": freq}
                            flights_dict[key]["arr_time"] = arr_time
                            
                        # Departure leg
                        if dep_to and dep_time and dep_to != "None" and dep_time != "None":
                            key = f"{flight_no}_{station_iata}_{dep_to}"
                            if key not in flights_dict:
                                flights_dict[key] = {"flight_no": flight_no, "origin": station_iata, "dest": dep_to, "airline": airline_name, "freq": freq}
                            flights_dict[key]["dep_time"] = dep_time

        except Exception as e:
            print(f"[DGCA Parser] Error parsing {file}: {e}")

    # Filter complete legs
    valid_flights = []
    for k, v in flights_dict.items():
        if "dep_time" in v and "arr_time" in v:
            valid_flights.append(v)
            
    with open(cache_file, "w") as f:
        json.dump(valid_flights, f, indent=4)
        
    return valid_flights

def load_cached_flights(cache_file: str = "data/parsed_flights.json") -> List[Dict[str, Any]]:
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            return json.load(f)
    else:
        return parse_all_pdfs(cache_file)

if __name__ == "__main__":
    flights = parse_all_pdfs()
    print(f"Parsed {len(flights)} complete flight legs.")
