
try:
    from crewai import Agent
    print(f"Agent has knowledge_sources arg? {'knowledge_sources' in Agent.__init__.__code__.co_varnames}")
except Exception as e:
    print(f"Error checking Agent: {e}")

try:
    import crewai.knowledge.source
    print("crewai.knowledge.source exists")
    print(dir(crewai.knowledge.source))
except ImportError:
    print("crewai.knowledge.source NOT found")

try:
    from crewai_tools import PDFSearchTool
    print("crewai_tools.PDFSearchTool exists")
except ImportError:
    print("crewai_tools.PDFSearchTool NOT found")
