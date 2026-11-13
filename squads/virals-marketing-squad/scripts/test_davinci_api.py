import sys
import os

# Add DaVinci Resolve scripting API path
API_PATH = os.path.expandvars(r"%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules")
sys.path.append(API_PATH)

try:
    import DaVinciResolveScript as bmd
    resolve = bmd.scriptapp("Resolve")
    if resolve:
        print("Successfully connected to DaVinci Resolve!")
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        print(f"Current project: {project.GetName()}")
    else:
        print("Resolve object not found. Is DaVinci Resolve running?")
except ImportError:
    print("Could not import DaVinci Resolve API.")
