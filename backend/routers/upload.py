import re
import time

import boto3
from botocore.client import Config
from fastapi import APIRouter, Depends, HTTPException, Request

from backend.auth import get_current_user
from backend.config import get_settings

router = APIRouter(prefix="/api/upload", tags=["upload"])

_UNSAFE_CHARS = re.compile(r"[^a-zA-Z0-9.-]")
_WHITESPACE = re.compile(r"\s+")


def _s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4", region_name="auto"),
    )


@router.post("")
async def presign_upload(req: Request, user=Depends(get_current_user)):
    # Auth is now required to generate an upload URL — the original Next.js
    # route let anyone request a presigned PUT into the bucket unauthenticated.
    body = await req.json()
    filename = body.get("filename")
    content_type = body.get("contentType")

    if not filename or not content_type:
        raise HTTPException(status_code=400, detail="Filename and contentType are required")

    is_video = content_type.startswith("video/")
    is_image = content_type.startswith("image/")
    if not is_video and not is_image:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images and videos are allowed.")

    safe_filename = _UNSAFE_CHARS.sub("", _WHITESPACE.sub("-", filename))
    unique_filename = f"{int(time.time() * 1000)}-{safe_filename}"

    settings = get_settings()
    client = _s3_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": unique_filename, "ContentType": content_type},
        ExpiresIn=300,
    )
    public_url = f"{settings.r2_public_url}/{unique_filename}"

    return {
        "success": True,
        "uploadUrl": upload_url,
        "publicUrl": public_url,
        "type": "video" if is_video else "image",
    }
