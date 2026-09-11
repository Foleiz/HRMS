import sys, os, subprocess, json
sys.stdout.reconfigure(encoding='utf-8')

def run_cmd(cmd, cwd=None):
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd, encoding='utf-8', errors='replace')
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return -1, '', str(e)

def check_wrapup_status(project_root):
    status = {
        'git_branch': '',
        'modified_files': [],
        'untracked_files': [],
        'daily_reports': []
    }
    
    # 1. Check Git
    rc, out, _ = run_cmd('git branch --show-current', cwd=project_root)
    if rc == 0:
        status['git_branch'] = out
        
    rc, out, _ = run_cmd('git status --porcelain', cwd=project_root)
    if rc == 0 and out:
        for line in out.splitlines():
            prefix = line[:2].strip()
            fname = line[3:].strip()
            if prefix == '??':
                status['untracked_files'].append(fname)
            else:
                status['modified_files'].append(fname)
                
    # 2. Check daily reports
    dr_dir = os.path.join(project_root, 'daily_reports')
    if os.path.exists(dr_dir):
        status['daily_reports'] = os.listdir(dr_dir)
        
    return status

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    res = check_wrapup_status(root)
    print(json.dumps(res, ensure_ascii=False, indent=2))
