from enum import Enum

class Weather(Enum):
    SUNNY = "Sunny"
    RAINY = "Rainy"
    SNOW = "Snow"
    CLOUDY = "Cloudy"

class CrowdLevel(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

class TransportType(Enum):
    FLIGHT = "Flight"
    TRAIN = "Train"
    BUS = "Bus"
    CAB = "Cab"
