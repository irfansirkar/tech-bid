import re

content = open(r'c:\Users\sirka\Desktop\QUIZGAME\src\app\admin\domains\page.tsx', encoding='utf-8').read()

# Fix broken badge line (isQuickAdd removal artifact)
content = content.replace(
    '{                        {isRapidFire',
    '{isRapidFire'
)

# Remove Quick Add button block
content = re.sub(
    r'[ \t]*<Button[ \t]*\r?\n[ \t]*onClick=\{\(\) => updateStatus\(domain\.id, "quick_add"\)\}.*?</Button>\r?\n',
    '',
    content,
    flags=re.DOTALL
)

# Rename Rapid Fire -> Start Quiz Time in button label
content = content.replace('/> Rapid Fire\n', '/> Start Quiz Time\n')
content = content.replace('trigger Rapid Fire rounds', 'trigger Quiz Time rounds')
content = content.replace('/* Rapid Fire Buzzer', '/* Quiz Time Buzzer')
content = content.replace("'Show Rapid Fire Question'", "'Show Quiz Time Question'")

open(r'c:\Users\sirka\Desktop\QUIZGAME\src\app\admin\domains\page.tsx', 'w', encoding='utf-8').write(content)
print('Done')
