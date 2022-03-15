const dotenv = require("dotenv").config();
const siteConfig = {
  siteName: "gadgets360",
  rssFeedUrl: "https://gadgets360.com/rss/feeds",
  siteDomain: "https://gadgets360.com",
  crawlWithPuppeteer: false,
  siteMapPathArr: [],
  entitiesToKeep: [
    "Apple",
    "Mobile",
    "Broadband",
    "Home",
    "Infinix",
    "Iqoo",
    "Tecno",
    "Itel",
    "Social",
    "Smart",
    "Fire",
    "Gionee",
    "Nikon",
    "Daikin",
    "Carrier",
    "Whirlpool",
    "Haier",
    "Voltas",
    "Lava",
    "Blue",
    "Zte",
    "Fastrack",
    "Toshiba",
    "Hitachi",
    "Nubia",
    "Mitsubishi",
    "Intex",
    "Godrej",
    "Lloyd",
    "Videocon",
    "Philips",
    "Bosch",
    "Boult",
    "Zebronics",
    "Alcatel",
    "Fossil",
    "Daiwa",
    "Iball",
    "Kodak",
    "Karbonn",
    "Sharp",
    "Garmin",
    "Coolpad",
    "Timex",
    "Ptron",
    "Onida",
    "Fitbit",
    "Lyf",
    "Dizo",
    "Meizu",
    "Thomson",
    "Bpl",
    "Grand",
    "Alienware",
    "Blaupunkt",
    "Iffalcon",
    "Infocus",
    "Fujifilm",
    "Orbital",
    "Android",
    "RSS",
    "Google Podcasts",
    "Google",
    "iOS",
    "Amazon",
    "iPhone",
    "Twitter",
    "TV",
    "TVs",
    "Samsung Galaxy",
    "Xiaomi",
    "Samsung",
    "Facebook",
    "PC",
    "MediaTek",
    "Sony",
    "Flipkart",
    "YouTube",
    "Netflix",
    "Microsoft",
    "Spotify",
    "Redmi",
    "GPU",
    "GPS",
    "NFC",
    "WhatsApp",
    "Realme",
    "AI",
    "USB",
    "Apple Podcasts",
    "Qualcomm",
    "Google Play",
    "Thomson Reuters",
    "OnePlus",
    "Windows",
    "CPU",
    "iPad",
    "Intel",
    "Jio",
    "App Store",
    "Instagram",
    "Vivo",
    "Dolby Atmos",
    "Android 10",
    "Oppo",
    "Snapdragon",
    "TV shows",
    "Prime Video",
    "Airtel",
    "Windows 10",
    "Bitcoin",
    "Motorola",
    "Nvidia",
    "Mac",
    "CPUs",
    "Asus",
    "Xbox One",
    "S Pen",
    "Reliance",
    "Nokia",
    "AMD",
    "Geekbench",
    "NDTV",
    "Disney+ Hotstar",
    "Amazon Prime Video",
    "Lenovo",
    "PS4",
    "LG",
    "Corning Gorilla Glass",
    "NFTs",
    "Xbox",
    "GPUs",
    "GFXBench",
    "PUBG Mobile",
    "Google Play Store",
    "Ethereum",
    "Elon Musk",
    "iPhone SE",
    "Intel Core",
    "Disney",
    "Mi",
    "Dolby Vision",
    "Huawei",
    "SpO2",
    "IPS display",
    "Tesla",
    "Vodafone",
    "Super AMOLED",
    "Bollywood",
    "Apple Watch",
    "FM radio",
    "Cryptocurrency",
    "Steam",
    "Reddit",
    "Siri",
    "Oppo Reno 7",
    "SSD",
    "Alexa",
    "Paytm",
    "Marvel",
    "OnePlus Nord",
    "Amazon Prime",
    "Call of Duty",
    "Dell",
    "OnePlus 9",
    "BSNL",
    "T-Rex",
    "Amazon India",
    "MIUI",
    "SBC",
    "LED",
    "Meta",
    "Asphalt 9",
    "AAC",
    "Note",
    "MacBook Air",
    "HP",
    "Gmail",
    "Ether",
    "Android TV",
    "Dogecoin",
    "Google Maps",
    "OnePlus 8",
    "OTT",
    "LPDDR4X",
    "Chromecast",
    "ANC",
    "Chrome",
    "NFT",
    "Dolby",
    "Portrait mode",
    "Mi.com",
    "Hotstar",
    "Windows 11",
    "Edge",
    "Messenger",
    "NASA",
    "iPhones",
    "HDFC Bank",
    "QR code",
    "OnePlus 9R",
    "Android 9",
    "Nintendo",
    "Pro Max",
    "Vi",
    "United States",
    "AirPods",
    "Headphones",
    "Teams",
    "TikTok",
    "Camera",
    "Zoom",
    "PlayStation 4",
    "Bluetooth 5.1",
    "LPDDR4x",
    "Disney+",
    "HomePod",
    "Gorilla Glass",
    "ICICI Bank",
    "Hollywood",
    "PS5",
    "Google Chrome",
    "Google Pixel",
    "VR",
    "PlayStation",
    "Qualcomm Snapdragon 888 SoC",
    "MacBook Pro",
    "Linux",
    "Face ID",
    "Smartphones",
    "LinkedIn",
    "GLONASS",
    "Avengers",
    "Vodafone Idea",
    "Zee5",
    "Play Store",
    "Type-C",
    "Realme Narzo",
    "Ethernet port",
    "Snapchat",
    "OxygenOS",
    "Uber",
    "Safari",
    "The Verge",
    "iPhone 13",
    "iTunes",
    "Telecom Talk",
    "Moto",
    "Windows 10 Home",
    "Android One",
    "Xbox Series X",
    "Apple Music",
    "Android Police",
    "Micromax",
    "Galaxy Note",
    "iPhone 12",
    "Poco",
    "PlayStation 5",
    "Thunderbolt 4",
    "Telegram",
    "Mi Notebook",
    "HBO",
    "Mi Home",
    "HMD Global",
    "PUBG",
    "M1",
    "Galaxy S22+",
    "SamMobile",
    "Fortnite",
    "Dolby Audio",
    "Chrome OS",
    "USB 3.0",
    "Idea",
    "Privacy",
    "OnePlus 8T",
    "iPhone X",
    "Alphabet",
    "Epic Games",
    "OnePlus Watch",
    "Redmi Note",
    "Reliance Jio",
    "Zomato",
    "Triple Rear Cameras",
    "Amazon Music",
    "Google Drive",
    "iPhone 11",
    "Samsung Galaxy Note",
    "AirPods Pro",
    "Intel Core i7",
    "Axis Bank",
    "Corning Gorilla Glass 3",
    "Noise",
    "Honor",
    "Smart TV",
    "S21",
    "Galaxy S22 Ultra",
    "Galaxy S21",
    "Amazon.in",
    "iPhone XR",
    "Acer",
    "Bloomberg",
    "LEDs",
    "Android 8.1",
    "Buds",
    "Cameras",
    "Crypto",
    "OnePlus 9 Pro",
    "Warp Charge",
    "EMIs",
    "Laptops",
    "GeForce",
    "Star Wars",
    "Funtouch",
    "iCloud",
    "DTS",
    "OTA",
    "Bharti Airtel",
    "ROG",
    "JBL",
    "Snapdragon 8 Gen 1 SoC",
    "Nintendo Switch",
    "Google Pay",
    "MyJio",
    "Galaxy",
    "Tomb Raider",
    "Xiaomi TVs",
    "Shiba Inu",
    "TCL",
    "Reliance Digital",
    "Battlegrounds Mobile India",
    "Sun",
    "Windows Phone",
    "Radeon RX",
    "MSI",
    "Ethernet",
    "iPhone 12 Pro",
    "Touch ID",
    "NavIC",
    "YouTube Music",
    "Mukesh Ambani",
    "Corning Gorilla Glass Victus",
    "Realme UI",
    "SpaceX",
    "Flash Charge",
    "Jio Fiber",
    "Apple TV",
    "Windows 7",
    "Gaana",
    "Snapdragon 888 SoC",
    "Marvel Cinematic Universe",
    "Ambient light sensor",
    "Ubisoft",
    "iPhone 7",
    "PS4 Pro",
    "MacBook",
    "Origin",
    "FaceTime",
    "Tata Sky",
    "Sennheiser",
    "Android Pie",
    "Game of Thrones",
    "Nord",
    "iPad Pro",
    "Amazon Alexa",
    "Xbox One X",
    "Walmart",
    "Pixel 4a",
    "iMac",
    "Samsung Galaxy S20",
    "Dimensity 700 SoC",
    "NVMe SSD",
    "DTH",
    "Mark Zuckerberg",
    "Vivo V23",
    "Redmi 9",
    "Silicon Valley",
    "LED TV",
    "Samsung Galaxy Tab",
    "Jio Phone",
    "iPhone 8",
    "Phone 5s",
    "Boat",
    "PS5 Digital Edition",
    "iPhone 13 Pro",
    "Skype",
    "Android 12",
    "Sony Pictures",
    "Binance",
    "Croma",
    "TelecomTalk",
    "iPhone XS",
    "iPad mini",
    "Galaxy S20",
    "OneDrive",
    "Google Meet",
    "Outlook",
    "TFT display",
    "Reno 7",
    "Smartwatches",
    "Head",
    "Harman Kardon",
    "Logitech",
    "Narendra Modi",
    "OnePlus Nord 2",
    "iPhone 6",
    "Galileo",
    "FIFA",
    "OnlyTech",
    "LCD screen",
    "iPod touch",
    "HBO Max",
    "CMOS sensor",
    "Doctor Strange",
    "Warner Bros.",
    "Eros Now",
    "Nightscape",
    "Windows 8",
    "EA",
    "OnePlus 9RT",
    "JioCinema",
    "Xbox 360",
    "JioSaavn",
    "Speaker",
    "Galaxy S",
    "Lens",
    "PlayStation Store",
    "Galaxy Unpacked",
    "Flip 3",
    "Xiaomi Mi",
    "Dropbox",
    "Reuters",
    "Windows Hello",
    "Wall Street",
    "FE 5G",
    "Marshmallow",
    "Earphones",
    "God of War",
    "BlackBerry",
    "Google Photos",
    "Slack",
    "Maps",
    "AKG",
    "USP",
    "SBI",
    "Galaxy S22",
    "Samsung Galaxy S22",
    "Call of Duty Mobile",
    "Funtouch OS",
    "Tencent",
    "Wear OS",
    "Swiggy",
    "MagSafe",
    "Assistant support",
    "Neo",
    "OnePlus 10 Pro",
    "iPhone 11 Pro",
    "PhonePe",
    "Canon",
    "Snapdragon 888",
    "Qualcomm Snapdragon 870 SoC",
    "HLG",
    "EV",
    "Airtel Thanks",
    "iPad Air",
    "Ryzen",
    "Galaxy S21 Ultra",
    "Reliance Industries",
    "True Tone",
    "HTC",
    "Galaxy Z",
    "MacBooks",
    "CoinSwitch Kuber",
    "Realme Link",
    "Atmos",
    "TRAI",
    "Macs",
    "Redmi Note 10 Pro",
    "Vivo India",
    "XDA Developers",
    "DLC",
    "Coinbase",
    "Exynos",
    "VESA",
    "Dolby Vision HDR",
    "Metaverse",
    "TENAA",
    "PCIe",
    "Dell Inspiron",
    "iOS 15",
    "Realme 9 Pro",
    "Helio P35 SoC",
    "Firefox",
    "OpenSea",
    "Black Widow",
    "iOS 14",
    "Vu",
    "MacBook Air M1",
    "Helio G80 SoC",
    "AFP",
    "Blu-ray",
    "Far Cry 5",
    "S21 Ultra",
    "Jeff Bezos",
    "DSLR",
    "Poco X2",
    "Excel",
    "OxygenOS 11",
    "Amazfit",
    "Google Docs",
    "Mi QLED",
    "Xbox Series S",
    "MTNL",
    "Qualcomm Snapdragon 778G SoC",
    "OnePlus 6T",
    "UC Browser",
    "Realme 9 Pro+",
    "OnePlus 8 Pro",
    "Galaxy A-series",
    "PayPal",
    "Solana",
    "Alibaba",
    "Mi TV 4X",
    "AAA",
    "SonyLIV",
    "Wynk Music",
    "Surface",
    "Realme 9",
    "IDC",
    "Helio G85 SoC",
    "Lollipop",
    "Bitcoin price",
    "Fire-Boltt",
    "iPadOS",
    "India Today",
    "Voot",
    "Samsung Electronics",
    "Fn",
    "CPU performance",
    "Battlegrounds",
    "Qualcomm Snapdragon 888",
    "Quad Rear Cameras",
    "Galaxy Watch",
    "Realme TV",
    "Oppo Reno 6",
    "RGB",
    "Orange",
    "Fire TV Stick 4K",
    "Panasonic",
    "EVs",
    "Redmi Note 8",
    "Helio G95 SoC",
    "Nvidia GeForce",
    "Microsoft Store",
    "S20 Ultra",
    "Galaxy Tab",
    "Verizon",
    "Samsung Galaxy Z Fold",
    "GeForce GTX",
    "Blockchain",
    "AMOLED screen",
    "Qualcomm Snapdragon",
    "Amazon Fire TV",
    "LED display",
    "Bose",
    "TechCrunch",
    "Thunderbolt 3",
    "BIS",
    "PD",
    "Gyroscope",
    "Redmi Note 7 Pro",
    "Redmi Note 9 Pro",
    "iMessage",
    "GeForce RTX",
    "Electronic Arts",
    "Galaxy Z Fold",
    "Mi Box 4K",
    "JioTV",
    "iPhone 13 Pro Max",
    "IBM",
    "Redmi Note 11 Pro",
    "Realme GT",
    "PowerPoint",
    "Google Search",
    "OnePlus 6",
    "Hasselblad",
    "Visa",
  ],
};

const sqlDbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
};

const couchbaseConfig = {
  server: process.env.COUCHBASE_SERVER,
  user: process.env.COUCHBASE_USER,
  password: process.env.COUCHBASE_PASSWORD,
  bucket: process.env.COUCHBASE_BUCKET,
};

module.exports = {
  siteConfig,
  sqlDbConfig,
  couchbaseConfig,
};
