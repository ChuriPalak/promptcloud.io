import os
import shutil

# Only process src/ directory and package.json
src_dir = "./src"
package_json = "./package.json"

# Rebrand in src/ files
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.html', '.json', '.md')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                content = content.replace('GoCloudX', 'PromptCloud')
                content = content.replace('gocloudx.com', 'promptcloud.io')
                content = content.replace('GoCloudX Bot', 'PromptCloud Bot')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Updated: {path}')
            except Exception as e:
                print(f'Error: {path} - {e}')

# Rebrand package.json
if os.path.exists(package_json):
    with open(package_json, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('gocloudx-website', 'promptcloud-io')
    content = content.replace('GoCloudX', 'PromptCloud')
    with open(package_json, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated: {package_json}')

print('Done')
