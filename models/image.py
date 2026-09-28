from pydantic import BaseModel
from typing import Optional

class PlaceImage(BaseModel):
    image_url: Optional[str] = None
    source: Optional[str] = None
    photographer: Optional[str] = None
    attribution: Optional[str] = None
