import os

for root, dirs, files in os.walk('.'):
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
print('Done')
