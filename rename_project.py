import os
import re

def replace_in_file(file_path, replacements):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content
        for old, new in replacements.items():
            new_content = re.sub(old, new, new_content, flags=re.IGNORECASE if isinstance(old, str) else 0)
            # Extra handling for specific Hindi strings if needed
            new_content = new_content.replace(old, new) if isinstance(old, str) else new_content

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    root_dir = os.getcwd()
    replacements = {
        'IRA Sathi': 'Satpura Bio',
        'IRA SATHI': 'Satpura Bio',
        'IRA-SATHI': 'SATPURA-BIO',
        'IRASATHI': 'SATPURABIO',
        'IRA Partner': 'Satpura Bio Partner',
        'IRA ID': 'Satpura ID',
        'ईरा साथी': 'सतपुड़ा बायो',
        'आईआरए पार्टनर': 'सतपुड़ा बायो',
        'ईरा आईडी': 'सतपुड़ा आईडी',
        '/logo.png': '/assets/Satpura-1.webp',
        'IRA Sathi.png': 'Satpura-1.webp'
    }

    exclude_dirs = {'.git', 'node_modules', 'dist', 'build', '.next'}
    exclude_files = {'rename_project.py', 'Satpura-1.webp'}

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file in exclude_files:
                continue
            if file.endswith(('.jsx', '.js', '.css', '.json', '.html', '.md', '.txt')):
                file_path = os.path.join(root, file)
                replace_in_file(file_path, replacements)

if __name__ == "__main__":
    main()
