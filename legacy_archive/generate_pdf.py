#!/usr/bin/env python3
"""
Gerador de PDF profissional para o relatório PRISMA 888
"""
import markdown2
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import os

# Configuração
MARKDOWN_FILE = "RELATORIO_COMPLETO_PRISMA888.md"
OUTPUT_PDF = "RELATORIO_PRISMA888.pdf"

# CSS profissional para o PDF
CSS_STYLE = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@page {
    size: A4;
    margin: 2cm 2.5cm;
    @top-center {
        content: "PRISMA 888 - Relatório Completo";
        font-family: 'Inter', sans-serif;
        font-size: 9pt;
        color: #6B7280;
    }
    @bottom-center {
        content: counter(page) " / " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 9pt;
        color: #6B7280;
    }
}

* {
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1F2937;
    background: white;
}

h1 {
    font-size: 28pt;
    font-weight: 800;
    color: #0B3F6D;
    margin-top: 0;
    margin-bottom: 0.5em;
    border-bottom: 4px solid #3B82F6;
    padding-bottom: 0.3em;
    page-break-after: avoid;
}

h2 {
    font-size: 18pt;
    font-weight: 700;
    color: #1E40AF;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    border-left: 4px solid #3B82F6;
    padding-left: 0.5em;
    page-break-after: avoid;
}

h3 {
    font-size: 14pt;
    font-weight: 600;
    color: #1F2937;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    page-break-after: avoid;
}

h4 {
    font-size: 12pt;
    font-weight: 600;
    color: #374151;
    margin-top: 1em;
    margin-bottom: 0.3em;
}

p {
    margin-bottom: 0.8em;
    text-align: justify;
}

a {
    color: #2563EB;
    text-decoration: none;
}

strong {
    font-weight: 600;
    color: #111827;
}

em {
    font-style: italic;
}

code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 9pt;
    background: #F3F4F6;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    color: #DC2626;
}

pre {
    background: #1F2937;
    color: #F9FAFB;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.4;
    margin: 1em 0;
    page-break-inside: avoid;
}

pre code {
    background: none;
    color: inherit;
    padding: 0;
}

blockquote {
    border-left: 4px solid #3B82F6;
    margin: 1em 0;
    padding: 0.5em 1em;
    background: #EFF6FF;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #1E40AF;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
    page-break-inside: avoid;
}

th {
    background: #0B3F6D;
    color: white;
    font-weight: 600;
    padding: 0.6em 0.8em;
    text-align: left;
    border: 1px solid #0B3F6D;
}

td {
    padding: 0.5em 0.8em;
    border: 1px solid #E5E7EB;
    vertical-align: top;
}

tr:nth-child(even) {
    background: #F9FAFB;
}

tr:hover {
    background: #EFF6FF;
}

ul, ol {
    margin: 0.8em 0;
    padding-left: 1.5em;
}

li {
    margin-bottom: 0.3em;
}

hr {
    border: none;
    height: 2px;
    background: linear-gradient(90deg, #3B82F6, #8B5CF6);
    margin: 2em 0;
}

/* Emojis como badges */
.emoji {
    font-size: 1.1em;
}

/* Cover page styling */
.cover-page {
    text-align: center;
    padding-top: 30%;
}

/* Índice */
#índice + ul {
    columns: 2;
    column-gap: 2em;
}

/* Status badges */
td:first-child {
    white-space: nowrap;
}

/* Print optimizations */
@media print {
    h1, h2, h3, h4 {
        page-break-after: avoid;
    }
    
    table, pre, blockquote {
        page-break-inside: avoid;
    }
    
    a {
        color: #1E40AF !important;
    }
}
"""

def main():
    print("🚀 Gerando PDF profissional do PRISMA 888...")
    
    # Ler o markdown
    with open(MARKDOWN_FILE, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    print("✅ Markdown lido")
    
    # Converter para HTML
    html_content = markdown2.markdown(
        markdown_content, 
        extras=[
            'fenced-code-blocks',
            'tables',
            'header-ids',
            'code-friendly',
            'cuddled-lists',
            'markdown-in-html'
        ]
    )
    
    print("✅ Convertido para HTML")
    
    # Wrap em documento HTML completo
    full_html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRISMA 888 - Relatório Completo</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    # Configuração de fontes
    font_config = FontConfiguration()
    
    # Gerar PDF
    print("⏳ Gerando PDF (pode demorar alguns segundos)...")
    
    html = HTML(string=full_html)
    css = CSS(string=CSS_STYLE, font_config=font_config)
    
    html.write_pdf(
        OUTPUT_PDF,
        stylesheets=[css],
        font_config=font_config
    )
    
    # Verificar tamanho
    size = os.path.getsize(OUTPUT_PDF)
    size_kb = size / 1024
    
    print(f"✅ PDF gerado com sucesso!")
    print(f"📄 Arquivo: {OUTPUT_PDF}")
    print(f"📊 Tamanho: {size_kb:.1f} KB")
    print(f"📁 Caminho: {os.path.abspath(OUTPUT_PDF)}")

if __name__ == "__main__":
    main()
