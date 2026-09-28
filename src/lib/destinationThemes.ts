export type DestinationTheme = 
  | 'default'
  | 'deserts_dunes'
  | 'tropical_coasts_beaches'
  | 'forests_valleys_jungles'
  | 'arctic_ice_glaciers'
  | 'lakes_fjords_rivers'
  | 'heritage_old_cities'
  | 'twilight_metropolis'
  | 'starry_skyscrapers';

export const SUB_CATEGORIES: Record<string, string[]> = {
  "snow_alpine_mountains": ["auli", "dharamshala", "gulmarg", "kargil", "leh", "manali", "mcleodganj", "nubra", "shimla", "spiti", "srinagar"],
  "tropical_beaches": ["alibaug", "digha", "goa", "gokarna", "havelock", "kanyakumari", "kovalam", "pondicherry", "puri", "varkala"],
  "arid_desert": ["barmer", "bhuj", "bikaner", "jaisalmer", "jodhpur", "kutch", "mandawa", "pushkar", "rannofkutch"],
  "lush_jungles": ["bandhavgarh", "bandipur", "jimcorbett", "kabini", "kanha", "kaziranga", "periyar", "ranthambore", "sunderbans", "wayanad"],
  "historic_heritage": ["agra", "ajanta", "ellora", "gwalior", "hampi", "jaipur", "khajuraho", "konark", "mysore", "udaipur"],
  "spiritual_sacred": ["amritsar", "bodhgaya", "haridwar", "katra", "madurai", "rameshwaram", "rishikesh", "shirdi", "tirupati", "varanasi"],
  "misty_tea_hills": ["chikmagalur", "coonoor", "coorg", "darjeeling", "kodaikanal", "mahabaleshwar", "munnar", "ooty", "shillong"],
  "backwaters_lakes": ["alleppey", "bhimtal", "chilika", "dal", "kumarakom", "nainital", "pangongtso", "vembanad", "wular"],
  "waterfalls_valleys": ["athirappilly", "dudhsagar", "dzukou", "jog", "shivasamudra", "valleyofflowers"],
  "urban_metros_and_hubs": ["ahmedabad", "allahabad", "aurangabad", "bangalore", "bareilly", "belagavi", "bengaluru", "bhopal", "bhubaneswar", "chandigarh", "chennai", "chhatrapatisambhajinagar", "dehradun", "delhi", "faridabad", "ghaziabad", "gorakhpur", "guntur", "gurgaon", "hublidharwad", "hyderabad", "indore", "jabalpur", "jammu", "jhansi", "kanpur", "kolhapur", "kolkata", "lucknow", "meerut", "mumbai", "nagpur", "nashik", "navimumbai", "newdelhi", "noida", "patna", "prayagraj", "pune", "raipur", "rajkot", "ranchi", "solapur", "srinagar", "thiruvananthapuram", "trivandrum", "vadodara", "vijayawada"],
  "industrial_and_manufacturing_hubs": ["aligarh", "amroha", "ankleshwar", "asansol", "baddi", "bhilai", "bhiwadi", "bokaro", "bulandshahr", "chakan", "coimbatore", "dewas", "durgapur", "firozabad", "haldia", "hapur", "hosur", "jalgaon", "jamshedpur", "korba", "loni", "ludhiana", "mandi", "manesar", "moradabad", "morbi", "nagda", "oragadam", "panipat", "parwanoo", "peenya", "pimpri", "pithampur", "ponda", "rampur", "ranipet", "rourkela", "rudrapur", "salem", "satna", "shahjahanpur", "singrauli", "sivakasi", "solan", "sriperumbudur", "surat", "tinsukia", "tiruppur", "vapi"],
  "coastal_port_cities": ["alibaug", "dhamra", "ennore", "gangavaram", "gopalpur", "haldia", "jaigarh", "kakinada", "kandla", "karwar", "kochi", "krishnapatnam", "machilipatnam", "mangalore", "mangaluru", "margao", "marmagao", "mundra", "paradip", "pipavav", "pondicherry", "portblair", "ratnagiri", "thoothukudi", "tuticorin", "vascodagama", "veraval", "visakhapatnam"],
  "northeast_frontier_towns": ["agartala", "aizawl", "bomdila", "cherrapunji", "dharmanagar", "dibrugarh", "dimapur", "gangtok", "guwahati", "haflong", "imphal", "itanagar", "jorhat", "jowai", "kohima", "lunglei", "mokokchung", "nagaon", "namchi", "passighat", "pelling", "shillong", "silchar", "tawang", "tezpur", "tinsukia", "tura", "unakoti", "ziro"],
  "academic_and_research_hubs": ["aligarh", "anantapur", "bardhaman", "burdwan", "dehradun", "dharamshala", "gaya", "greaternoida", "guwahati", "kharagpur", "kota", "manipal", "mcleodganj", "nainital", "nanded", "patna", "pilani", "pondicherry", "roorkee", "shantiniketan", "shillong", "tiruchirappalli", "trichy", "vellore", "walajapet", "warangal"],
  "emerging_smart_cities": ["agartala", "aizawl", "ajmer", "alwar", "ambala", "amravati", "amritsar", "anantnag", "asansol", "aurangabad", "baddi", "balasore", "baramulla", "bareilly", "bathinda", "belagavi", "belgaum", "berhampur", "bhagalpur", "bhilai", "bhopal", "bhubaneswar", "bikaner", "bilaspur", "bokaro", "brahmapur", "chhatrapatisambhajinagar", "coimbatore", "cuttack", "darbhanga", "dehradun", "dewas", "dhanbad", "dharamshala", "dharwad", "dibrugarh", "durg", "durgapur", "faridabad", "gangtok", "gaya", "ghaziabad", "gorakhpur", "greaternoida", "guntur", "gurgaon", "guwahati", "gwalior", "haldia", "haldwani", "haridwar", "hazaribagh", "hisar", "hubli", "imphal", "indore", "itanagar", "jabalpur", "jalandhar", "jammu", "jamshedpur", "jhansi", "jodhpur", "karnal", "kashipur", "katni", "kochi", "kohima", "kolhapur", "korba", "kurukshetra", "ludhiana", "madurai", "mandi", "mangalore", "mangaluru", "meerut", "mohali", "moradabad", "muzaffarnagar", "muzaffarpur", "mysore", "mysuru", "nashik", "noida", "panchkula", "panipat", "pathankot", "patiala", "purnia", "raipur", "rajkot", "ranchi", "rewa", "rishikesh", "rohtak", "roorkee", "rourkela", "rudrapur", "saharanpur", "sambalpur", "satna", "shillong", "shimla", "sikar", "silchar", "siliguri", "solan", "solapur", "sonipat", "srinagar", "surat", "thiruvananthapuram", "tiruchirappalli", "trichy", "trivandrum", "udaipur", "ujjain", "vadodara", "vijayawada", "yamunanagar"],
  "mineral_rich_and_mining_towns": ["angul", "asansol", "bailadila", "bokaro", "bokarosteelcity", "chandrapur", "chirimiri", "dhanbad", "gua", "hazaribagh", "jharsuguda", "katni", "keonjhar", "kirandul", "korba", "kothagudem", "manuguru", "neyveli", "noamundi", "raigarh", "ramagundam", "rourkela", "satna", "singareni", "singrauli", "talcher"],
  "agricultural_hubs_and_command_areas": ["alwar", "anantapur", "ara", "bardhaman", "bathinda", "begusarai", "bharatpur", "bhimavaram", "biharsharif", "coimbatore", "eluru", "guntur", "hazaribagh", "hisar", "hoshangabad", "karnal", "kolhapur", "kottayam", "kurukshetra", "maldah", "mandsaur", "medinipur", "nagaon", "narmadapuram", "palakkad", "purnia", "rajahmundry", "ratlam", "rohtak", "sangli", "satara", "sikar", "sirsa", "sriganganagar", "tanjore", "tenali", "thanjavur", "tiruchirappalli"],
  "military_and_garrison_towns": ["agracantonment", "ambala", "amritsar", "babina", "bareillycantonment", "barrackpore", "bhuj", "danapur", "delhicantonment", "deolali", "firozpur", "gwalior", "jalandhar", "jammu", "jodhpur", "kamptee", "kasauli", "khadki", "lansdowne", "lucknowcantonment", "meerutcantonment", "mhow", "pathankot", "punecontonment", "ramgarh", "ranikhet", "secunderabad", "shillong", "udhampur", "wellingdon", "wellington", "yol"],
  "island_territories_and_coastal_outposts": ["amindivi", "carnicobar", "daman", "diu", "havelock", "kadmat", "kalpeni", "kavaratti", "minicoy", "neilisland", "portblair", "silvassa"]
};

export const SUB_THEME_MAPPING: Record<string, DestinationTheme> = {
  "snow_alpine_mountains": "arctic_ice_glaciers",
  "tropical_beaches": "tropical_coasts_beaches",
  "arid_desert": "deserts_dunes",
  "lush_jungles": "forests_valleys_jungles",
  "historic_heritage": "heritage_old_cities",
  "spiritual_sacred": "heritage_old_cities",
  "misty_tea_hills": "forests_valleys_jungles",
  "backwaters_lakes": "lakes_fjords_rivers",
  "waterfalls_valleys": "forests_valleys_jungles",
  "urban_metros_and_hubs": "twilight_metropolis",
  "industrial_and_manufacturing_hubs": "twilight_metropolis",
  "coastal_port_cities": "tropical_coasts_beaches",
  "northeast_frontier_towns": "forests_valleys_jungles",
  "academic_and_research_hubs": "twilight_metropolis",
  "emerging_smart_cities": "starry_skyscrapers",
  "mineral_rich_and_mining_towns": "twilight_metropolis",
  "agricultural_hubs_and_command_areas": "forests_valleys_jungles",
  "military_and_garrison_towns": "heritage_old_cities",
  "island_territories_and_coastal_outposts": "tropical_coasts_beaches"
};

export const SUB_IMAGE_QUERIES: Record<string, string> = {
  "arid_desert": "Thar desert sand dunes landscape",
  "lush_jungles": "Western Ghats forest aerial scenic",
  "historic_heritage": "Hampi stone chariot landscape",
  "spiritual_sacred": "Varanasi ghats evening aarti scenic",
  "misty_tea_hills": "Munnar tea gardens misty landscape",
  "backwaters_lakes": "Alleppey backwaters houseboat scenic",
  "island_territories_and_coastal_outposts": "Lakshadweep islands lagoon aerial",
  "military_and_garrison_towns": "Lansdowne pine forest landscape",
  "agricultural_hubs_and_command_areas": "Punjab mustard fields sarson scenic",
  "mineral_rich_and_mining_towns": "Deccan plateau boulder landscape",
  "emerging_smart_cities": "Sabarmati riverfront Ahmedabad night aerial",
  "academic_and_research_hubs": "Forest Research Institute Dehradun landscape",
  "northeast_frontier_towns": "Tawang monastery landscape scenic",
  "coastal_port_cities": "Marine Drive Mumbai evening landscape",
  "industrial_and_manufacturing_hubs": "Jubilee Park Jamshedpur scenic",
  "urban_metros_and_hubs": "Bandra Worli Sea Link night aerial",
  "waterfalls_valleys": "Athirappilly waterfalls Kerala landscape"
};

export const DESTINATION_CATEGORIES: Record<string, string[]> = {
  "arctic_ice_glaciers": [
    "manali", "shimla", "leh", "gulmarg", "auli", "sissu", "chitkul", "kalpa", "dras", "kaza", 
    "spiti", "lachen", "lachung", "pahalgam", "sonamarg", "tawang", "munsiyari", "chopta", 
    "harsil", "khajjiar", "triund", "kufri", "nako", "keylong", "darcha", "jispa", "kargil", 
    "diskit", "hunder", "turtuk", "padum", "rangdum", "sangla", "sarahan", "theog", "narkanda", 
    "chamba", "dalhousie", "bhaderwah", "yusmarg", "doodhpathri", "aru", "pelling", "yumthang", 
    "katao", "gnathang", "zuluk", "ravangla", "namchi", "srinagar", "mcleodganj", "dharamshala", 
    "kasauli", "chail", "barog", "solang", "vashisht", "tosh", "kasol", "malana", "kheerganga", 
    "kalatop", "dhankar", "tabo", "kibber", "langza", "hikkim", "komic", "mud", "losar", "shey", 
    "alchi", "hemis", "likir", "lamayuru", "sumur", "panamik", "zanskar", "sankri", "joshimath", 
    "govindghat", "badrinath", "kedarnath", "gangotri", "yamunotri", "hemkundsahib", "garmukh", 
    "rohtang", "sach", "kunzum", "baralacha", "chang", "khardung", "nubra", "jammu", "sikkim",
    "roing", "anini", "bomdila", "dirang", "ziro", "passighat", "mechuka", "walong"
  ],
  "tropical_coasts_beaches": [
    "goa", "gokarna", "havelock", "kovalam", "varkala", "marari", "alibaug", "diu", "kavaratti", 
    "pondicherry", "mahabalipuram", "kanyakumari", "mandvi", "puri", "digha", "tarkarli", 
    "malvan", "devbagh", "murudeshwar", "cherai", "bekal", "kannur", "kollam", "karwar", "udupi", 
    "mangalore", "bapatla", "yarada", "rishikonda", "maravanthe", "kapu", "vengurla", "kashid", 
    "murudjanjira", "harihareshwar", "diveagar", "shrivardhan", "ganpatipule", "guhagar", 
    "velneshwar", "ratnagiri", "talasari", "bordi", "daman", "silvassa", "somnath", "dwarka", 
    "madhavpur", "chorwad", "gopnath", "tithal", "dumas", "ullal", "somesheshwara", "panambur", 
    "malpe", "stmarys", "kaup", "ottinene", "byndoor", "bhatkal", "netrani", "sadashivgad", 
    "kurumgad", "vagator", "anjuna", "calangute", "baga", "candolim", "sinquerim", "miramar", 
    "donapaula", "colva", "benaulim", "cavelossim", "varca", "mobor", "agonda", "palolem", 
    "patnem", "galgibaga", "rajbagh", "kudle", "halfmoon", "paradise", "nirvana", "baithkol", 
    "tilmati", "majali", "rabindranathtagore", "kizhunna", "payyambalam", "muzhappilangaddrivein", 
    "dharmadam", "kappad", "beypore", "kozhikode", "nattika", "fortkochi", "mararikulam", 
    "alappuzha", "thottappally", "andhakaranazhi", "kayamkulam", "varkalapapanasam", 
    "kadinamkulam", "shankumugham", "kovalamlighthouse", "hawa", "samudra", "poovar", "chowara", 
    "vizhinjam", "thiruvambadi", "poppys", "panjim", "panaji", "margao", "vasco", "mapusa", "ponda",
    "neil", "portblair", "diglipur", "baratang", "rossisland", "agatti", "bangaram", "minicoy", 
    "kalpeni", "kadmat", "amini", "androth", "chandipur", "konark", "gopalpur", "paradeep", "aryavalli", 
    "kakinada", "machilipatnam", "nellore", "marina", "elliots", "breezy", "rameswaram",
    "dhamra", "ennore", "gangavaram", "jaigarh", "kandla", "krishnapatnam", "mangaluru", "marmagao", "mundra", "pipavav", "thoothukudi", "tuticorin", "vascodagama", "veraval", "visakhapatnam",
    "amindivi", "carnicobar", "neilisland"
  ],
  "deserts_dunes": [
    "jaisalmer", "thar", "bikaner", "kutch", "jodhpur", "pushkar", "bhuj", "khimsar", "osian", 
    "barmer", "mandawa", "samode", "pokhran", "sambhar", "rannofkutch", "dholavira", "shekhawati", 
    "nawalgarh", "jhunjhunu", "fatehpur", "ramgarhrajasthan", "churu", "sikar", "nagaur", "khuri", 
    "sam", "luni", "pali", "jalore", "sirohi", "phalodi", "dechu", "deshnoke", "gajner", "kolayat", 
    "talchhapar", "pilani", "alsisar", "mahansar", "dundlod", "mukundgarh", "laxmangarh", "salasar", 
    "khatushyam", "nakoda", "balotra", "jaswantgarh", "kuchaman", "didwana", "merta", "rohet", 
    "sodawas", "kanoje", "sanchore", "bhinmal", "desuri", "narlai", "ranakpur", "sadri", "falna", 
    "bali", "aburoad", "mandore", "jhalawar", "bundi", "kota", "bhilwara", "rajsamand", 
    "nathdwara", "kumbhalgarh", "mountabu", "abu", "sujangarh", "sardarshahar", "ratangarh", 
    "makrana", "nohar", "bhadra"
  ],
  "forests_valleys_jungles": [
    "jimcorbett", "ranthambore", "kaziranga", "kanha", "bandhavgarh", "periyar", "wayanad", 
    "kabini", "silent", "bandipur", "nagarhole", "mudumalai", "tadoba", "pench", "sunderbans", 
    "sassangir", "manas", "panna", "satpura", "sariska", "valparai", "thekkady", "masinagudi", 
    "dandeli", "maredumilli", "amboli", "agumbe", "dudhwa", "simlipal", "nameri", "orang", 
    "dibrusaikhowa", "namdapha", "balpakram", "nokrek", "keibullamjao", "mollem", "netravali", 
    "cotigao", "bhagwanmahaveer", "anshi", "bhimeashwar", "kudremukh", "mookambika", "sharavathi", 
    "someshwara", "shendurney", "peppara", "neyyar", "chinnar", "eravikulam", "mathikettanshola", 
    "anamudishola", "pampadumshola", "chimmony", "peechivazhani", "parambikulam", "aralam", 
    "munnar", "ooty", "darjeeling", "coonoor", "kodaikanal", "kurseong", "chikmagalur", 
    "madikeri", "coorg", "vagamon", "vythiri", "lonavala", "khandala", "mahabaleshwar", 
    "panchgani", "matheran", "saputara", "araku", "horsley", "lambasingi", "peermade", "ponmudi", 
    "nelliampathi", "yercaud", "yelagiri", "kotagiri", "meghamalai", "mawsynram", "cherrapunji", 
    "shillong", "kalimpong", "mirik", "rishyap", "lava", "lolegaon", "samsing", "fagu", "kausani", 
    "ranikhet", "almora", "mukteshwar", "bhowali", "ramgarhuttarakhand", "lansdowne", "chakrata", 
    "mussoorie", "dhanaulti", "kanatal", "chambauttarakhand", "pauri", "tehri", "nainital", 
    "bhimtal", "sattal", "naukuchiatal", "kullu", "palampur", "dharamkot", "bhagsu", "naldehra", 
    "mashobra", "shoghi", "solan", "dagshai", "subathu", "morni", "mountabu", "chikhaldara", 
    "jawhar", "toranmal", "mhaismal", "bhandardara", "igatpuri", "karjat", "dehradun", "siliguri", 
    "jalpaiguri", "guwahati", "tezpur", "jorhat", "dibrugarh", "tinsukia", "silchar", "imphal", 
    "kohima", "aizawl", "agartala", "itanagar", "gangtok", "namdapha", "pakhui", "kaziranga", "manas",
    "dzukou", "valleyofflowers", "dharmanagar", "haflong", "jowai", "lunglei", "mokokchung", "nagaon", "tura", "unakoti",
    "ara", "begusarai", "bharatpur", "bhimavaram", "biharsharif", "eluru", "hoshangabad", "kottayam", "maldah", "mandsaur", "medinipur", "narmadapuram", "palakkad", "ratlam", "sirsa", "sriganganagar", "tanjore", "tenali"
  ],
  "heritage_old_cities": [
    "jaipur", "udaipur", "gwalior", "hampi", "khajuraho", "ajanta", "ellora", "chittorgarh", 
    "mandu", "orchha", "agra", "tajmahal", "fatehpursikri", "mysore", "badami", "pattadakal", 
    "aihole", "konark", "bijapur", "bidar", "gulbarga", "murshidabad", "jaunpur", "sasaram", 
    "nalanda", "rajgir", "sanchi", "bhimbetka", "chanderi", "kumbhalgarh", "ranikivav", "patan", 
    "junagadh", "lothal", "champaner", "pawagadh", "golconda", "warangal", "halebidu", "belur", 
    "srirangapatna", "shravanabelagola", "mahore", "daulatabad", "sanjhan", "kalyan", "chaul", 
    "vasai", "kondan", "raigad", "pratapgad", "sinhagad", "torna", "rajgad", "panhala", 
    "varanasi", "rishikesh", "haridwar", "tirupati", "amritsar", "madurai", "rameshwaram", 
    "shirdi", "amarnath", "vaishnodevi", "katra", "guruvayur", "sabarimala", "velankanni", 
    "bodhgaya", "sarnath", "kushinagar", "sravasti", "tiruvannamalai", "chidambaram", 
    "thanjavur", "srirangam", "ujjain", "omkareshwar", "maheshwar", "gaya", "ayodhya", 
    "mathura", "vrindavan", "palitana", "tarapith", "kalighat", "kamakhya", "dakshineswar", 
    "puri", "jagannath", "dwarka", "somnath", "kanchipuram", "kumbakonam", "trichy", "tiruchirappalli", 
    "pinto", "sringeri", "udupi", "dharmasthala", "kukke", "gokarna", "kollur",
    "agracantonment", "babina", "bareillycantonment", "barrackpore", "danapur", "delhicantonment", "deolali", "firozpur", "kamptee", "khadki", "lucknowcantonment", "meerutcantonment", "mhow", "punecontonment", "ramgarh", "secunderabad", "udhampur", "wellingdon", "wellington", "yol"
  ],
  "lakes_fjords_rivers": [
    "alleppey", "kumarakom", "vembanad", "ashtamudi", "chilika", "loktak", "kuttanad", "nakki", 
    "pangongtso", "tsomoriri", "wular", "dal", "anchar", "manasbal", "nigeen", "prashar", 
    "chandrataal", "surajtaal", "tsongmo", "gurudongmar", "khecheopalri", "kathok", "karthok", 
    "green", "pulicat", "kolleru", "husainsagar", "osmansagar", "himayatsagar", "miralamtank", 
    "durgamcheruvu", "shamirpet", "udhagamandalam", "berijam", "pookode", "karalad", "vellayani", 
    "sasthamkotta", "akkulam", "veli", "anchuthengu", "edava", "nadavara", "kappil", "paravur", 
    "jog", "dudhsagar", "athirappilly", "dhuandhar", "jabalpurmarble", "yana", "courtallam", 
    "shivasamudra", "hogenakkal", "ziro", "yuksom", "mawlynnong", "valleyofflowers", "kaas", 
    "nainital", "bhimtal", "sattal", "naukuchiatal", "renukaji", "rewalsar", "surinsar", "mansar", 
    "sanasar", "bhojtal", "upperlake", "lowerlake", "kankaria", "thol", "nal", "sambhar", "pushkar", 
    "pichola", "fatehsagar", "jaisamand", "udaisagar", "rajasmand", "ana"
  ],
  "twilight_metropolis": [
    "mumbai", "delhi", "chennai", "kolkata", "pune", "ahmedabad", "surat", "hyderabad", 
    "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal", "patna", "vadodara", "ghaziabad", 
    "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot", "kalyan", "dombivli", "vasai", 
    "virar", "varanasi", "srinagar", "aurangabad", "dhanbad", "amritsar", "navimumbai", "allahabad", 
    "howrah", "ranchi", "gwalior", "jabalpur", "coimbatore", "vijayawada", "jodhpur", "madurai", 
    "raipur", "kota", "guwahati", "chandigarh", "solapur", "hubli", "dharwad", "bareilly", "moradabad", 
    "mysore", "gurugram", "aligarh", "jalandhar", "tiruchirappalli", "bhubaneswar", "salem", "mira", 
    "bhayandar", "thiruvananthapuram", "bhiwandi", "saharanpur", "gorakhpur", "bikaner", "amravati", 
    "noida", "jamshedpur", "bhilai", "cuttack", "firozabad", "kochi", "nellore", "bhavnagar", 
    "dehradun", "durgapur", "asansol", "rourkela", "nanded", "kolhapur", "ajmer", "akola", "gulbarga", 
    "jamnagar", "ujjain", "loni", "siliguri", "jhansi", "ulhasnagar", "jammu", "sangli", "miraj", 
    "kupwad", "mangalore", "erode", "belgaum", "ambattur", "tirunelveli", "malegaon", "gaya", 
    "jalgaon", "udaipur", "maheshtala", "davanagere", "kozhikode", "kurnool", "rajpur", "sonarpur", 
    "rajahmundry", "bokaro", "southdumdum", "bellary", "patiala", "gopalpur", "agartala", "bhagalpur", 
    "muzaffarnagar", "bhatpara", "panihati", "latur", "dhule", "tirupati", "rohtak", "korba", 
    "bhilwara", "berhampur", "muzaffarpur", "ahmednagar", "mathura", "kollam", "avadi", "kadapa", 
    "kamarhati", "sambalpur", "bilaspur", "shahjahanpur", "satara", "bijapur", "rampur", "shivamogga", 
    "chandrapur", "junagadh", "thrissur", "alwar", "bardhaman", "kulti", "kakinada", "nizamabad", 
    "parbhani", "tumkur", "khammam", "uzhavoor", "hoshiarpur", "batala",
    "chhatrapatisambhajinagar", "guntur", "hublidharwad", "newdelhi", "prayagraj", "trivandrum",
    "amroha", "ankleshwar", "baddi", "bhiwadi", "bokaro", "bulandshahr", "chakan", "dewas", "haldia", "hapur", "hosur", "mandi", "manesar", "morbi", "nagda", "oragadam", "panipat", "parwanoo", "peenya", "pimpri", "pithampur", "ranipet", "rudrapur", "singrauli", "sivakasi", "sriperumbudur", "tiruppur", "vapi",
    "anantapur", "burdwan", "kharagpur", "manipal", "roorkee", "shantiniketan", "vellore", "walajapet",
    "angul", "bailadila", "bokarosteelcity", "chirimiri", "gua", "jharsuguda", "katni", "keonjhar", "kirandul", "kothagudem", "manuguru", "neyveli", "noamundi", "raigarh", "ramagundam", "singareni", "talcher"
  ],
  "starry_skyscrapers": [
    "bangalore", "bengaluru", "gurgaon", "noida", "singapore", "dubai", "newyork", "london", 
    "tokyo", "hongkong", "shanghai", "kualalumpur", "sydney", "toronto", "chicago", "cybercity", 
    "hitechcity", "whitefield", "elektronics", "bkc", "bandrakurla", "aerocity", "giftcity", 
    "dholera", "maggadi", "manyata", "greaternoida", "ambala", "anantnag", "balasore", "baramulla", "bathinda", "brahmapur", "darbhanga", "durg", "haldwani", "hisar", "karnal", "kashipur", "kurukshetra", "mohali", "mysuru", "panchkula", "pathankot", "purnia", "rewa", "sonipat", "yamunanagar"
  ]
};

const KEYWORD_MAPPINGS: Record<string, DestinationTheme> = {
  'beach': 'tropical_coasts_beaches',
  'coast': 'tropical_coasts_beaches',
  'island': 'tropical_coasts_beaches',
  'sea': 'tropical_coasts_beaches',
  'ocean': 'tropical_coasts_beaches',
  'hill': 'forests_valleys_jungles',
  'mountain': 'arctic_ice_glaciers',
  'valley': 'forests_valleys_jungles',
  'peak': 'arctic_ice_glaciers',
  'snow': 'arctic_ice_glaciers',
  'glacier': 'arctic_ice_glaciers',
  'desert': 'deserts_dunes',
  'sand': 'deserts_dunes',
  'dune': 'deserts_dunes',
  'lake': 'lakes_fjords_rivers',
  'river': 'lakes_fjords_rivers',
  'waterfall': 'lakes_fjords_rivers',
  'backwater': 'lakes_fjords_rivers',
  'fort': 'heritage_old_cities',
  'palace': 'heritage_old_cities',
  'heritage': 'heritage_old_cities',
  'temple': 'heritage_old_cities',
  'ruin': 'heritage_old_cities',
  'ancient': 'heritage_old_cities'
};

/**
 * Returns the theme category for a given city name.
 */
export function getThemeForCity(cityName: string): DestinationTheme {
  const subCategory = getSubCategoryForCity(cityName);
  if (subCategory && SUB_THEME_MAPPING[subCategory]) {
    return SUB_THEME_MAPPING[subCategory];
  }
  
  if (!cityName || typeof cityName !== 'string') return 'default';
  const lowerName = cityName.toLowerCase();
  
  // Fallback to exact arrays
  for (const [category, cities] of Object.entries(DESTINATION_CATEGORIES)) {
    for (const city of cities) {
      const regex = new RegExp(`\\b${city}\\b`, 'i');
      if (lowerName === city || regex.test(lowerName) || lowerName.replace(/[^a-z0-9]/g, '') === city) {
        return category as DestinationTheme;
      }
    }
  }

  // Fallback to keyword matching
  for (const [keyword, theme] of Object.entries(KEYWORD_MAPPINGS)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lowerName)) {
      return theme;
    }
  }
  
  return 'default';
}

/**
 * Returns the granular sub-category if found, used for fetching specific authentic images.
 */
export function getSubCategoryForCity(cityName: string): string | null {
  if (!cityName || typeof cityName !== 'string') return null;
  const lowerName = cityName.toLowerCase();
  
  for (const [subCategory, cities] of Object.entries(SUB_CATEGORIES)) {
    for (const city of cities) {
      const regex = new RegExp(`\\b${city}\\b`, 'i');
      if (lowerName === city || regex.test(lowerName) || lowerName.replace(/[^a-z0-9]/g, '') === city) {
        return subCategory;
      }
    }
  }
  return null;
}

/**
 * Returns the specific Wikipedia image query for the city.
 * Now dynamically searches Wikipedia for the exact city entered by the user!
 */
export function getImageUrlForCity(cityName: string, fallbackThemeImageUrl: string): string {
  if (!cityName) return fallbackThemeImageUrl;
  
  // Format the query to specifically search for the city in India
  // This prevents Wikipedia's full-text search from returning random global landmarks for short city names (like "Leh")
  const query = `${cityName} India`;
  return `/api/theme-wiki-image?q=${encodeURIComponent(query)}`;
}

// Every non-default theme used to be a fixed light pastel color with no dark:
// variant at all, so toggling dark mode had zero effect on any card/panel using
// it for a real destination (only the 'default' fallback theme ever responded).
// All themes now fall back to the same neutral dark surface 'default' already
// used, so dark mode is always readable — light mode keeps its per-destination
// pastel personality unchanged.
const DARK_FALLBACK = 'dark:bg-zinc-900/90';
const DARK_TEXT_FALLBACK = 'dark:text-zinc-100';

export const THEME_STYLES: Record<string, { card: string, text: string, imageUrl: string, bg?: string, glowColor?: string }> = {
  default: {
    card: 'bg-zinc-50/90 dark:bg-zinc-900/90',
    text: 'text-zinc-900 dark:text-zinc-100',
    imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80'
  },
  deserts_dunes: {
    card: `bg-[#C89368]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80'
  },
  tropical_coasts_beaches: {
    card: `bg-[#EADDC8]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  },
  forests_valleys_jungles: {
    card: `bg-[#D9E2D8]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80'
  },
  arctic_ice_glaciers: {
    card: `bg-[#E1EBF0]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1516496636080-14fb876e029d?auto=format&fit=crop&w=1200&q=80'
  },
  lakes_fjords_rivers: {
    card: `bg-[#DCE2E4]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80'
  },
  heritage_old_cities: {
    card: `bg-[#E4DCD3]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80'
  },
  twilight_metropolis: {
    card: `bg-[#E5EEF5]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1200&q=80'
  },
  starry_skyscrapers: {
    card: `bg-[#EAE6DF]/90 ${DARK_FALLBACK}`,
    text: `text-zinc-900 ${DARK_TEXT_FALLBACK}`,
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80'
  }
};
