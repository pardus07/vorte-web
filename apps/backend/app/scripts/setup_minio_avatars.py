import os
import json
from minio import Minio
from minio.error import S3Error

ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
ACCESS = os.getenv("MINIO_ROOT_USER", "minioadmin")
SECRET = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
BUCKET = os.getenv("AVATAR_BUCKET", "avatars")
USE_HTTPS = os.getenv("MINIO_USE_HTTPS", "false").lower() == "true"

client = Minio(ENDPOINT, access_key=ACCESS, secret_key=SECRET, secure=USE_HTTPS)

if not client.bucket_exists(BUCKET):
    client.make_bucket(BUCKET)

# CORS
cors = [{
    "AllowedOrigin": ["*"],
    "AllowedMethod": ["GET", "PUT"],
    "AllowedHeader": ["*"],
    "ExposeHeader": ["ETag"],
    "MaxAgeSeconds": 3600
}]
client.set_bucket_cors(BUCKET, cors)

# Public read policy
policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": ["*"]},
        "Action": ["s3:GetObject"],
        "Resource": [f"arn:aws:s3:::{BUCKET}/*"]
    }]
}
client.set_bucket_policy(BUCKET, json.dumps(policy))
print("OK")
