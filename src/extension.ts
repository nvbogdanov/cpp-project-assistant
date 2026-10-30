import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel(
		'C++ Project Assistant'
	);

	context.subscriptions.push(outputChannel);

	function runCommand(
		command: string,
		args: string[],
		cwd: string
	): Promise<number> {
		return new Promise((resolve, reject) => {
			const childProcess = spawn(command, args, { cwd });

			childProcess.stdout.on('data', (data) => {
				outputChannel.append(data.toString());
			});

			childProcess.stderr.on('data', (data) => {
				outputChannel.append(data.toString());
			});

			childProcess.on('error', (error) => {
				reject(error);
			});

			childProcess.on('close', (code) => {
				resolve(code ?? 1);
			});
		});
	}

	console.log('Congratulations, your extension "cpp-project-assistant" is now active!');

	const disposable = vscode.commands.registerCommand('cpp-project-assistant.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from cpp-project-assistant!');
	});

	context.subscriptions.push(disposable);

	const createProjectCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.createProject',
		async () => {
			const projectName = await vscode.window.showInputBox({
				prompt: 'Enter the name of your C++ project',
				placeHolder: 'MyCppProject',
				validateInput: (value) => {
					if (!value.trim()) {
						return 'Project name cannot be empty';
					}

					if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
						return 'Use only letters, numbers, hyphens and underscores';
					}

					return null;
				}
			});

			if (!projectName) {
				return;
			}

			const folderUri = await vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: 'Select project location'
			});

			if (!folderUri || folderUri.length === 0) {
				return;
			}

			const projectUri = vscode.Uri.joinPath(folderUri[0], projectName);

			try {
				// Check if the project directory already exists
				try {
					await vscode.workspace.fs.stat(projectUri);

					vscode.window.showWarningMessage(
						`Project "${projectName}" already exists!`
					);

					return;
				} catch {
					// Project directory does not exist
				}

				// Create project directories
				await vscode.workspace.fs.createDirectory(projectUri);
				await vscode.workspace.fs.createDirectory(
					vscode.Uri.joinPath(projectUri, 'src')
				);
				await vscode.workspace.fs.createDirectory(
					vscode.Uri.joinPath(projectUri, 'include')
				);
				await vscode.workspace.fs.createDirectory(
					vscode.Uri.joinPath(projectUri, 'tests')
				);

				// Create main.cpp
				const mainCpp = `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`;

				await vscode.workspace.fs.writeFile(
					vscode.Uri.joinPath(projectUri, 'src', 'main.cpp'),
					new TextEncoder().encode(mainCpp)
				);

				// Create CMakeLists.txt
				const cmakeLists = `cmake_minimum_required(VERSION 3.16)

project(${projectName})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

file(GLOB_RECURSE SOURCES CONFIGURE_DEPENDS
    "src/*.cpp"
)

add_executable(\${PROJECT_NAME} \${SOURCES})

target_include_directories(\${PROJECT_NAME} PRIVATE
    include
)
`;

				await vscode.workspace.fs.writeFile(
					vscode.Uri.joinPath(projectUri, 'CMakeLists.txt'),
					new TextEncoder().encode(cmakeLists)
				);

				// Create .gitignore
				const gitignore = `build/
cmake-build-*/
.idea/
.vscode/
.DS_Store
`;

				await vscode.workspace.fs.writeFile(
					vscode.Uri.joinPath(projectUri, '.gitignore'),
					new TextEncoder().encode(gitignore)
				);

				const openProject = await vscode.window.showInformationMessage(
					`C++ project "${projectName}" created successfully!`,
					'Open Project'
				);

				if (openProject === 'Open Project') {
					await vscode.commands.executeCommand(
						'vscode.openFolder',
						projectUri,
						{ forceNewWindow: true }
					);
				}
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to create project: ${error}`
				);
			}
		}
	);

	context.subscriptions.push(createProjectCommand);

	const createClassCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.createClass',
		async () => {
			const className = await vscode.window.showInputBox({
				prompt: 'Enter the C++ class name',
				placeHolder: 'MyClass',
				validateInput: (value) => {
					if (!value.trim()) {
						return 'Class name cannot be empty';
					}

					if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
						return 'Enter a valid C++ identifier';
					}

					return null;
				}
			});

			if (!className) {
				return;
			}

			const fieldsInput = await vscode.window.showInputBox({
				prompt: 'Enter class fields separated by semicolons',
				placeHolder: 'int age; std::string name; double averageGrade'
			});

			if (fieldsInput === undefined) {
				return;
			}

			const fields = fieldsInput
				.split(';')
				.map(field => field.trim())
				.filter(field => field.length > 0);

			const invalidField = fields.find(
				field => !/^.+\s+[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)
			);

			if (invalidField) {
				vscode.window.showErrorMessage(
					`Invalid field declaration: ${invalidField}`
				);
				return;
			}

			const fieldNames = fields.map(
				field => field.trim().split(/\s+/).pop()
			);

			if (new Set(fieldNames).size !== fieldNames.length) {
				vscode.window.showErrorMessage(
					'Field names must be unique!'
				);
				return;
			}

			const methodsInput = await vscode.window.showInputBox({
				prompt: 'Enter class methods separated by semicolons',
				placeHolder: 'void study(); int getAge() const; void setAge(int age)'
			});

			if (methodsInput === undefined) {
				return;
			}

			const methods = methodsInput
				.split(';')
				.map(method => method.trim())
				.filter(method => method.length > 0);

			const invalidMethod = methods.find(method => {
				return !/^(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\(.*\))\s*(const)?$/.test(method);
			});

			if (invalidMethod) {
				vscode.window.showErrorMessage(
					`Invalid method declaration: ${invalidMethod}`
				);
				return;
			}

			const parsedMethods = methods.map(method => {
				const match = method.match(
					/^(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\(.*\))\s*(const)?$/
				)!;

				return {
					returnType: match[1].trim(),
					name: match[2],
					parameters: match[3],
					isConst: Boolean(match[4])
				};
			});

			const methodSignatures = parsedMethods.map(
				method => `${method.name}${method.parameters}${method.isConst ? ' const' : ''}`
			);

			if (new Set(methodSignatures).size !== methodSignatures.length) {
				vscode.window.showErrorMessage(
					'Duplicate method declarations are not allowed!'
				);
				return;
			}

			const projectFolder = vscode.workspace.workspaceFolders?.[0];

			if (!projectFolder) {
				vscode.window.showErrorMessage(
					'Open a C++ project before creating a class!'
				);
				return;
			}

			const projectUri = projectFolder.uri;

			const includeUri = vscode.Uri.joinPath(projectUri, 'include');
			const srcUri = vscode.Uri.joinPath(projectUri, 'src');

			try {
				await vscode.workspace.fs.stat(includeUri);
				await vscode.workspace.fs.stat(srcUri);

				const headerUri = vscode.Uri.joinPath(
					includeUri,
					`${className}.h`
				);

				const sourceUri = vscode.Uri.joinPath(
					srcUri,
					`${className}.cpp`
				);

				// Check if class files already exist
				let headerExists = false;
				let sourceExists = false;

				try {
					await vscode.workspace.fs.stat(headerUri);
					headerExists = true;
				} catch {
					// Header file does not exist
				}

				try {
					await vscode.workspace.fs.stat(sourceUri);
					sourceExists = true;
				} catch {
					// Source file does not exist
				}

				if (headerExists || sourceExists) {
					vscode.window.showWarningMessage(
						`Class "${className}" already exists!`
					);
					return;
				}

				// Generate header file
				const headerContent = `#pragma once

class ${className} {
public:
    ${className}();
    ~${className}();

private:
${fields.map(field => `    ${field};`).join('\n')}

${parsedMethods.map(method => `    ${method.returnType} ${method.name}${method.parameters}${method.isConst ? ' const' : ''};`).join('\n')}
};
`;

				// Generate source file
				const sourceContent = `#include "${className}.h"

${className}::${className}() {
}

${className}::~${className}() {
}

${parsedMethods.map(method => {
					const constQualifier = method.isConst ? ' const' : '';
					const body = method.returnType === 'void'
						? ''
						: '\n    return {};';

					return `${method.returnType} ${className}::${method.name}${method.parameters}${constQualifier} {
${body}
}`;
				}).join('\n\n')}
`;

				// Write files
				await vscode.workspace.fs.writeFile(
					headerUri,
					new TextEncoder().encode(headerContent)
				);

				await vscode.workspace.fs.writeFile(
					sourceUri,
					new TextEncoder().encode(sourceContent)
				);

				vscode.window.showInformationMessage(
					`C++ class "${className}" created successfully!`
				);
			} catch {
				vscode.window.showErrorMessage(
					'Invalid C++ project structure! Both include/ and src/ directories must exist.'
				);
			}
		}
	);

	context.subscriptions.push(createClassCommand);

	const createFileCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.createFile',
		async () => {
			const fileName = await vscode.window.showInputBox({
				prompt: 'Enter the C++ file name',
				placeHolder: 'Algorithms',
				validateInput: (value) => {
					if (!value.trim()) {
						return 'File name cannot be empty';
					}

					if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
						return 'Use only letters, numbers and underscores';
					}

					return null;
				}
			});

			if (!fileName) {
				return;
			}

			const projectFolder = vscode.workspace.workspaceFolders?.[0];

			if (!projectFolder) {
				vscode.window.showErrorMessage(
					'Open a C++ project before creating a file!'
				);
				return;
			}

			const srcUri = vscode.Uri.joinPath(
				projectFolder.uri,
				'src'
			);

			try {
				await vscode.workspace.fs.stat(srcUri);
			} catch {
				vscode.window.showErrorMessage(
					'Invalid C++ project structure! The src/ directory does not exist.'
				);
				return;
			}

			const fileUri = vscode.Uri.joinPath(
				srcUri,
				`${fileName}.cpp`
			);

			try {
				await vscode.workspace.fs.stat(fileUri);

				vscode.window.showWarningMessage(
					`File "${fileName}.cpp" already exists!`
				);

				return;
			} catch {
				// File does not exist
			}

			const fileContent = `#include <iostream>

`;

			try {
				await vscode.workspace.fs.writeFile(
					fileUri,
					new TextEncoder().encode(fileContent)
				);

				vscode.window.showInformationMessage(
					`C++ file "${fileName}.cpp" created successfully!`
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to create file: ${error}`
				);
			}
		}
	);

	context.subscriptions.push(createFileCommand);

	const buildProjectCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.buildProject',
		async () => {
			const projectFolder = vscode.workspace.workspaceFolders?.[0];

			if (!projectFolder) {
				vscode.window.showErrorMessage(
					'Open a C++ project before building!'
				);
				return;
			}

			const cmakeUri = vscode.Uri.joinPath(
				projectFolder.uri,
				'CMakeLists.txt'
			);

			try {
				await vscode.workspace.fs.stat(cmakeUri);
			} catch {
				vscode.window.showErrorMessage(
					'CMakeLists.txt not found! Open a valid C++ project.'
				);
				return;
			}

			outputChannel.clear();
			outputChannel.show(true);

			outputChannel.appendLine(
				`Configuring project: ${projectFolder.name}`
			);

			try {
				const buildUri = vscode.Uri.joinPath(
					projectFolder.uri,
					'build'
				);

				const exitCode = await runCommand(
					'cmake',
					[
						'-S',
						projectFolder.uri.fsPath,
						'-B',
						buildUri.fsPath
					],
					projectFolder.uri.fsPath
				);

				if (exitCode !== 0) {
					vscode.window.showErrorMessage(
						'CMake configuration failed!'
					);
					return;
				}

				outputChannel.appendLine('');
				outputChannel.appendLine('Building project...');

				const buildExitCode = await runCommand(
					'cmake',
					[
						'--build',
						buildUri.fsPath
					],
					projectFolder.uri.fsPath
				);

				if (buildExitCode !== 0) {
					vscode.window.showErrorMessage(
						'Build failed! Check the Output panel for details.'
					);
					return;
				}

				outputChannel.appendLine('');
				outputChannel.appendLine('Build completed successfully!');

				vscode.window.showInformationMessage(
					`Project "${projectFolder.name}" built successfully!`
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to run CMake: ${error}`
				);
			}
		}
	);

	context.subscriptions.push(buildProjectCommand);

	const cleanBuildCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.cleanBuild',
		async () => {
			const projectFolder = vscode.workspace.workspaceFolders?.[0];

			if (!projectFolder) {
				vscode.window.showErrorMessage(
					'Open a C++ project first!'
				);
				return;
			}

			const buildUri = vscode.Uri.joinPath(
				projectFolder.uri,
				'build'
			);

			try {
				await vscode.workspace.fs.stat(buildUri);
			} catch {
				vscode.window.showInformationMessage(
					'Build directory does not exist.'
				);
				return;
			}

			const answer = await vscode.window.showWarningMessage(
				'Are you sure you want to delete the build directory?',
				{ modal: true },
				'Delete'
			);

			if (answer !== 'Delete') {
				return;
			}

			try {
				await vscode.workspace.fs.delete(
					buildUri,
					{ recursive: true }
				);

				vscode.window.showInformationMessage(
					'Build directory deleted successfully!'
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to delete build directory: ${error}`
				);
			}
		}
	);

	context.subscriptions.push(cleanBuildCommand);

	const projectStatisticsCommand = vscode.commands.registerCommand(
		'cpp-project-assistant.projectStatistics',
		async () => {
			const projectFolder = vscode.workspace.workspaceFolders?.[0];

			if (!projectFolder) {
				vscode.window.showErrorMessage(
					'Open a C++ project first!'
				);
				return;
			}

			try {
				const files = await vscode.workspace.findFiles(
					new vscode.RelativePattern(
						projectFolder,
						'**/*.{cpp,h}'
					),
					'**/build/**'
				);

				let cppCount = 0;
				let headerCount = 0;
				let lineCount = 0;
				let classCount = 0;
				let structCount = 0;
				let todoCount = 0;

				for (const file of files) {
					const content = new TextDecoder().decode(
						await vscode.workspace.fs.readFile(file)
					);

					if (file.fsPath.endsWith('.cpp')) {
						cppCount++;
					} else if (file.fsPath.endsWith('.h')) {
						headerCount++;
					}

					const lines = content.length > 0
						? content.split(/\r\n|\r|\n/)
						: [];

					if (lines[lines.length - 1] === '') {
						lines.pop();
					}

					lineCount += lines.filter(
						line => line.trim().length > 0
					).length;

					classCount += (
						content.match(/\bclass\s+[a-zA-Z_]\w*/g) || []
					).length;

					structCount += (
						content.match(/\bstruct\s+[a-zA-Z_]\w*/g) || []
					).length;

					todoCount += (
						content.match(/\bTODO\b/g) || []
					).length;
				}

				outputChannel.clear();
				outputChannel.show(true);

				outputChannel.appendLine(
					`Project Statistics: ${projectFolder.name}`
				);
				outputChannel.appendLine('------------------------------');
				outputChannel.appendLine(`C++ files: ${cppCount}`);
				outputChannel.appendLine(`Header files: ${headerCount}`);
				outputChannel.appendLine(`Non-empty lines: ${lineCount}`);
				outputChannel.appendLine(`Classes: ${classCount}`);
				outputChannel.appendLine(`Structs: ${structCount}`);
				outputChannel.appendLine(`TODO comments: ${todoCount}`);

				vscode.window.showInformationMessage(
					'Project statistics generated! See the Output panel.'
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to analyze project: ${error}`
				);
			}
		}
	);

	context.subscriptions.push(projectStatisticsCommand);
}

export function deactivate() { }
