import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from pathlib import Path

# I-load ang environment variables mula sa .env file
load_dotenv()

# I-configure ang Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# ✅ I-UPDATE ITO: Ang path ng iyong cablevision_uploads
local_uploads_path = Path(r'C:\xampp\htdocs\cablevision_uploads')

def upload_local_images():
    if not local_uploads_path.exists():
        print(f"Error: Ang folder na '{local_uploads_path}' ay hindi mahanap.")
        return

    # I-loop ang lahat ng files sa folder
    for file_path in local_uploads_path.rglob('*'):
        if file_path.is_file():
            try:
                # Kunin ang relative path para maging folder structure sa Cloudinary
                relative_path = file_path.relative_to(local_uploads_path)
                # Kunin ang folder name (hal. 'plans', 'advertisements')
                folder_name = relative_path.parent.as_posix() if relative_path.parent != Path('.') else 'general'

                print(f"☁️ Ina-upload ang: {file_path} sa folder 'cablevision/{folder_name}'...")
                
                # ✅ I-upload ang file sa Cloudinary na may public_id
                upload_result = cloudinary.uploader.upload(
                    str(file_path),
                    folder=f"cablevision/{folder_name}",
                    public_id=file_path.stem,  # ✅ Gamitin ang original filename (walang extension)
                    resource_type="auto",
                    overwrite=True  # ✅ I-overwrite ang existing file kung meron
                )
                
                print(f"   ✅ Uploaded! URL: {upload_result['secure_url']}")
                print(f"   📁 Public ID: {upload_result['public_id']}")

            except Exception as e:
                print(f"   ❌ Error sa pag-upload ng {file_path.name}: {e}")

if __name__ == "__main__":
    upload_local_images()
    print("🎉 Tapos na ang migration!")