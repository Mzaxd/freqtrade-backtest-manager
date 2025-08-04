# Kilo Code - MCP Server Configuration

This document provides a comprehensive overview of all configured MCP (Model-Context-Protocol) servers. It is designed to be a single source of truth for server configurations, invocation details, and usage.

---

## `context7`

- **Description**: Provides up-to-date documentation and code examples for any library.
- **Invocation Syntax**: `cmd /c npx -y @upstash/context7-mcp@latest`
- **Environment Variables**:
  - `DEFAULT_MINIMUM_TOKENS`: (No value set)
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: No explicit authentication configured.
- **Rate Limits**: Not specified in configuration.
- **Canonical Usage Example**: Resolving a library ID.
  ```xml
  <use_mcp_tool>
    <server_name>context7</server_name>
    <tool_name>resolve-library-id</tool_name>
    <arguments>
    {
      "libraryName": "react"
    }
    </arguments>
  </use_mcp_tool>
  ```

---

## `word-document-server`

- **Description**: A server for creating and manipulating Microsoft Word documents.
- **Invocation Syntax**: `python D:\Code\AI\Office-Word-MCP-Server\word_mcp_server.py`
- **Environment Variables**: None configured.
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: No authentication configured.
- **Rate Limits**: Not specified in configuration.
- **Canonical Usage Example**: Creating a new document.
  ```xml
  <use_mcp_tool>
    <server_name>word-document-server</server_name>
    <tool_name>create_document</tool_name>
    <arguments>
    {
      "filename": "my_report.docx",
      "title": "Quarterly Report",
      "author": "Kilo Code"
    }
    </arguments>
  </use_mcp_tool>
  ```

---

## `playwright`

- **Description**: Enables browser automation and interaction using Playwright.
- **Invocation Syntax**: `npx @playwright/mcp@latest`
- **Environment Variables**: None configured.
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: No authentication configured.
- **Rate Limits**: Not specified in configuration.
- **Canonical Usage Example**: Navigating to a webpage.
  ```xml
  <use_mcp_tool>
    <server_name>playwright</server_name>
    <tool_name>browser_navigate</tool_name>
    <arguments>
    {
      "url": "https://www.google.com"
    }
    </arguments>
  </use_mcp_tool>
  ```

---

## `desktop-commander`

- **Description**: A powerful server for interacting with the local desktop environment, including file system operations and command execution.
- **Invocation Syntax**: `cmd /c npx -y @wonderwhy-er/desktop-commander`
- **Environment Variables**: None configured.
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: No authentication configured.
- **Rate Limits**: Not specified in configuration.
- **Canonical Usage Example**: Listing files in the current directory.
  ```xml
  <use_mcp_tool>
    <server_name>desktop-commander</server_name>
    <tool_name>list_directory</tool_name>
    <arguments>
    {
      "path": "."
    }
    </arguments>
  </use_mcp_tool>
  ```

---

## `shadcn-ui-mcp-server`

- **Description**: Provides access to `shadcn/ui` v4 components, blocks, and metadata.
- **Invocation Syntax**: `cmd /c npx -y @jpisnice/shadcn-ui-mcp-server`
- **Environment Variables**:
  - `GITHUB_PERSONAL_ACCESS_TOKEN`: `ghp_x8...9M9` (Value is present but truncated for security)
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: Requires a GitHub Personal Access Token for fetching data from the GitHub API.
- **Rate Limits**: Subject to the rate limits of the GitHub API.
- **Canonical Usage Example**: Listing available components.
  ```xml
  <use_mcp_tool>
    <server_name>shadcn-ui-mcp-server</server_name>
    <tool_name>list_components</tool_name>
    <arguments>{}</arguments>
  </use_mcp_tool>
  ```

---

## `mcp-server-chart`

- **Description**: A server for generating a wide variety of data visualizations and charts.
- **Invocation Syntax**: `cmd /c npx -y @antv/mcp-server-chart`
- **Environment Variables**: None configured.
- **Configuration Files**:
  - `c:/Users/Caihaohan/AppData/Roaming/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`
- **Authentication**: No authentication configured.
- **Rate Limits**: Not specified in configuration.
- **Canonical Usage Example**: Generating a simple pie chart.
  ```xml
  <use_mcp_tool>
    <server_name>mcp-server-chart</server_name>
    <tool_name>generate_pie_chart</tool_name>
    <arguments>
    {
      "title": "Browser Market Share",
      "data": [
        { "category": "Chrome", "value": 65 },
        { "category": "Safari", "value": 18 },
        { "category": "Edge", "value": 5 },
        { "category": "Firefox", "value": 3 },
        { "category": "Other", "value": 9 }
      ]
    }
    </arguments>
  </use_mcp_tool>