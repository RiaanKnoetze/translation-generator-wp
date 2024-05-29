# Translation Generator WP

![Translation Generator WP](translation-generator-wp.png)

## Project Overview

The Translation Generator WP is a Node.js proof-of-concept project designed to streamline the process of generating translations for WordPress sites. This tool simplifies the localization process, making it easier for developers and content creators to manage multilingual content.

## Dependencies

The project relies on the following dependencies:

- Node.js: JavaScript runtime built on Chrome's V8 JavaScript engine.
- Express: Fast, unopinionated, minimalist web framework for Node.js.
- Dotenv: Module that loads environment variables from a `.env` file into `process.env`.
- Other dependencies as listed in `package.json`.

## Installation

Follow these steps to set up the project:

1. **Clone the repository:**

```
git clone https://github.com/yourusername/translation-generator-wp.git
cd translation-generator-wp
```

2. **Install dependencies:**

Ensure you have `Node.js` installed on your system. Then run:

```
npm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory of the project and add `OPENAI_API_KEY=sk-123` where `sk-123` is your OpenAI API Key.

4. **Run the project:**

Start the node server by running:

```
npm start
sudo node server.js
```

5. **Access the application:**
Open your web browser and navigate to http://localhost:3000 to start using the Translation Generator WP.

## Additional Information

* Ensure you have the latest version of Node.js for the best performance and compatibility.
* For detailed information on each dependency, refer to the package.json file.
* This version only currently supports French localizations.

