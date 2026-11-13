import re
import sys

def sync(summary_path, platform, ranking_path):
    try:
        with open(summary_path, 'r', encoding='utf-8') as f:
            summary = f.read()
    except FileNotFoundError:
        print(f"Summary file not found: {summary_path}")
        return
    
    # Find the section for the platform
    pattern = rf"## 🏆 Ranking {platform.upper()}(.*?)(?=## 🏆 Ranking|\Z)"
    section_match = re.search(pattern, summary, re.DOTALL | re.IGNORECASE)
    if not section_match:
        print(f"Section for {platform} not found in summary.")
        return

    section = section_match.group(1)
    marked_ranks = set(re.findall(r"\| \[x\] \| (\d+) \|", section))
    print(f"Marked ranks for {platform}: {marked_ranks}")

    try:
        with open(ranking_path, 'r', encoding='utf-8') as f:
            ranking_lines = f.readlines()
    except FileNotFoundError:
        print(f"Ranking file not found: {ranking_path}")
        return

    new_lines = []
    for line in ranking_lines:
        match = re.match(r"^\| \[ \] \| (\d+) \|", line)
        if match and match.group(1) in marked_ranks:
            new_lines.append(line.replace("[ ]", "[x]"))
        else:
            new_lines.append(line)

    with open(ranking_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

sync('workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-06-16/_summary-2026-06-16.md', 'instagram', 'workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-06-16/instagram-ranking-2026-06-16.md')
sync('workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-06-16/_summary-2026-06-16.md', 'youtube', 'workspaces/businesses/tiago-elesbao/marketing/daily-monitoring/2026-06-16/youtube-ranking-2026-06-16.md')
