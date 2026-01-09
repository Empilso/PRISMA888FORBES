def check_chars():
    filepath = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/frontend/src/components/campaign/RadarPremium.tsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    start_line = 610
    end_line = 620
    
    for i in range(start_line, end_line):
        if i >= len(lines):
            break
        line = lines[i]
        numbered_line = f"{i+1}: {repr(line)}"
        print(numbered_line)
        
        # Check for non-ascii or weird chars
        for char in line:
            if ord(char) > 127 or ord(char) < 32 and char not in ('\n', '\t', '\r'):
                 print(f"!!! Suspicious char at line {i+1}: {repr(char)} code {ord(char)}")

if __name__ == "__main__":
    check_chars()
