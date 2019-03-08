const Promise = require('bluebird');
const _ = require('lodash');
const path = require('path');
const { Command, flags } = require('@oclif/command');
const { BaseCommand } = require('oclif-plugin-base');
const { dump } = require('dumper.js');
const spinner = new (require('@geek/spinner'))();
const module_name = path.parse(module.id).name;
const chalk = require('chalk');
const fs = Promise.promisifyAll(require('fs-extra'));
const pathExists = require('path-exists');
const temp = require('temp');
const findit = require('findit');
const { using } = Promise;
const npm = require('@geek/npm');
const globby = require('globby');
const colors = require('colors');
const multimatch = require('multimatch');


const logger = func_name => {
	var prefix = func_name ? `[${module_name}.${func_name}] ` : `[${module_name}`;
	return _.wrap(require('debug')('hero'), (func, msg) => func(chalk.blue(prefix) + msg));
};
const debug = logger();

class CreateCommand extends BaseCommand {
	async run() {

		const { args, flags } = this.parse(CreateCommand);
		args.template = args.template || flags.template || this.compositeConfig.template || '@titanium/template-alloy-default';
		this.checkRequiredArgs(CreateCommand.args, args, flags, [ 'name' ]);

		args.currentYear = new Date().getFullYear();
		args.publisher = args.publisher || this.compositeConfig.publisher || 'my-company';

		if (!args.id) {
			// In order for a name to be safe for both iOS and Android,
			// it can't have anything other than alphanumeric characters.
			const safePublisher = args.publisher.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
			const safeName = args.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
			args.id = `${safePublisher}.${safeName}`;
		}
		args.id = args.id || `${_.snakeCase(args.publisher.trim()).toLowerCase()}.${_.snakeCase(args.name.trim()).toLowerCase()}`;
		args.path = args.path || path.join(process.cwd(), args.name);

		args.description = args.description || this.compositeConfig.description || 'Another awesome Titanium app!';
		args.guid = args.guid || this.compositeConfig.guid;

		if (args.guid === 'empty-guid') {
			args.guid = '00000000-0000-0000-0000-000000000000';
		// } else if (args.guid === 'new-guid') {
		} else if (_.isNil(args.guid)) {
			const uuidv4 = require('uuid/v4');
			args.guid = uuidv4();
		}

		args.copyright = args.copyright || this.compositeConfig.copyright || `Copyright (c) ${args.currentYear} ${args.publisher}`;
		args.url = args.url || this.compositeConfig.url || '';

		// dump(this.compositeConfig);
		// dump(this.config);
		// dump(args);

		const debug = logger('execute');
		var titanium_directory;

		debug(`args: ${JSON.stringify(args, null, 2)}`);
		debug(`__dirname: ${__dirname}`);
		debug(`process.cwd(): ${process.cwd()}`);

		var project_directory = args['path'];
		debug(`project_directory: ${project_directory}`);
		debug(`project_directory.exists: ${pathExists.sync(project_directory)}`);

		const getTempDirectory = () => {
			const temp_directory = temp.path({ prefix: 'titanium' });
			fs.emptyDirSync(temp_directory);
			debug(`temp_directory: ${JSON.stringify(temp_directory, null, 2)}`);
			return Promise.resolve(temp_directory).disposer((directory, promise) => {
				fs.removeSync(directory);
			});
		};

		const configure_project_directory = () => {
			spinner.start('Configuring project directory');
			return fs.ensureDirAsync(project_directory)
				.then(() => {
					spinner.info();
					spinner.note(project_directory, 1);
				});
		};

		const template_file = filename => {
			const debug = logger('template_file');
			filename = path.join(project_directory, filename);
			debug(`templating file: ${filename}`);
			spinner.start(filename, 2);
			return fs
				.readFileAsync(filename)
				.then(source => fs.writeFileAsync(filename, _.template(source)(args)))
				.then(() => spinner.note());
		};

		const template_other_files = () => {
			const debug = logger('template_other_files');
			spinner.info('Templating other files', 1);
			return Promise.mapSeries([ 'tiapp.xml', 'package.json' ], template_file);
		};

		const findTiappXml = root => {
			const debug = logger('findTiappXml');
			// eslint-disable-next-line promise/avoid-new
			return new Promise((resolve, reject) => {
				spinner.start('Looking for Titanium project file', 1);
				debug(`looking for tiapp.xml in: ${root}`);
				var finder = findit(root);
				finder.on('file', (file, stat) => {
					var filepath = path.parse(file);
					if (filepath.base === 'tiapp.xml') {
						spinner.succeed();
						resolve(filepath.dir);
						finder.stop();
					}
				});
				finder.on('end', () => {
					spinner.fail();
					spinner.fail(chalk.red('Titanium project file not found'), 2);
					reject('Titanium project file not found');
				});
				finder.on('error', error => {
					spinner.fail();
					reject(error);
				});

			}).then(result => {
				titanium_directory = result;
				if (!titanium_directory) {
					spinner.fail(chalk.red('Titanium project file not found'), 2);
					throw new Error('Titanium project file not found');
				}
				spinner.note(titanium_directory, 2);
			});
		};

		const configure_project_files = () => {
			spinner.info('Configuring project files');
			return ensure_package_json()
				.then(() => spinner.start('Finding template files', 1))
				.then(() => globby([ '**/*-template.*', '**/*.*-template' ], { cwd: args.path, onlyFiles: true, deep: true, dot: true }))
			 	.then(files => {
					spinner.succeed();
					spinner.info('Templating project files', 1);
					return Promise.mapSeries(files, file => {
						const new_filename = file.replace('-template', '');
						return fs
							.copyAsync(path.join(project_directory, file), path.join(project_directory, new_filename), { overwrite: true })
							.then(() => fs.removeSync(path.join(project_directory, file)))
							.then(() => template_file(new_filename));
					});
				});
		};

		const copy_template = name => {
			const debug = logger('copy_template');
			spinner.info('Installing template', 0);
			var source = path.resolve(name);
			debug(`source: ${source}`);
			spinner.start('Checking for local template', 1);
			return pathExists(source).then(exists => {
				debug(`pathExists.sync(source): ${exists}`);
				if (exists) {
					spinner.succeed();
					debug(`copying files to project root directory: ${project_directory}`);
					spinner.start('Copying template to project root directory', 1);
					return fs.copyAsync(source, project_directory, {
						clobber: true,
						filter:  file => {
							return true;
						},
					}).then(() => {
						spinner.succeed();
						return true;
					});
				} else {
					spinner.skip();
					spinner.note('Local template not found.', 2);

					return using(getTempDirectory(), temp_directory => {
						const nodeModulesDir = path.join(temp_directory, 'node_modules');
						debug(`installing remote template to: ${project_directory}`);
						spinner.start(`Installing remote template: ${chalk.gray(name)}`, 1);
						return npm
							.install([ name, '--ignore-scripts', '--global-style' ], {
								cwd:    temp_directory,
								silent: true,
							})
							.then(() => {
								// eslint-disable-next-line promise/avoid-new
								return new Promise((resolve, reject) => {
									spinner.succeed();
									spinner.start('Examining template', 1);

									var finder = findit(nodeModulesDir);
									finder.on('file', (file, stat) => {
										var filepath = path.parse(file);
										if (_.includes([ 'package.json', 'package-template.json' ], filepath.base)) {
											spinner.succeed();
											resolve(filepath.dir);
											finder.stop();
										}
									});
								});
							})
							.then(template_source => {
								debug(`copying files to project root directory: ${project_directory}`);
								spinner.start('Copying template to project root directory', 1);
								return fs.copyAsync(template_source, project_directory, {
									clobber: true,
									filter:  file => {
										const filepath = file.substring(template_source.length);
										return multimatch(filepath, [ '*', '!/package.json' ]);
									},
								}).then(() => {
									spinner.succeed();
									return true;
								});
							});
					});
				}
			});
		};

		const ensure_package_json = () => {
			debug('ensuring that package.json exists in project root');
			spinner.info('Ensuring package.json exists in project root.', 1);
			const packagePath = path.join(project_directory, 'package.json');
			return fs.pathExists(packagePath)
				.then(exists => {
					if (!exists) {
						spinner.warn('package.json not found in project root.');
						spinner.start('creating default package.json in project root', 2);
						const pkg = {
							name:        args.id,
							version:     '0.0.1',
							description: args.description,
							main:        'index.js',
							scripts:     [],
							keywords:    [],
							author:      args.author || args.publisher,
							license:     args.license,

						};

						return fs.outputJsonAsync(packagePath, pkg)
							.then(() => spinner.succeed());
					} else {
						spinner.note('package.json found in project root directory', 2);
					}
				});
		};

		configure_project_directory()
			.then(() => copy_template(args.template))
			.then(() => findTiappXml(project_directory))
			.then(() => configure_project_files())
			.then(() => {
				spinner.start('Installing npm dependencies', 1);
				return npm
					.install({
						cwd:    project_directory,
						silent: true,
					})
					.then(() => spinner.succeed());
			})
			.then(template_other_files)
			.catch(err => {
				console.error(`Error occurred: ${err}`);
				console.error(err);
				spinner.fail(err);
			});

		process.on('unhandledRejection', (reason, promise) => {
			console.error(`Error occurred: ${reason}`);
			console.error(reason);
			spinner.fail(reason);
		});
	}
}

CreateCommand.description = `Create a shiny new mobile application
...
Create a new mobile app from a template using all sorts of nifty options!

Tool will create an app using values from parameters or from the user config file which is located here:  ~/.config/@geek/mobile/config.json
Future versions of the tool will allow setting config values from CLI.
`;
CreateCommand.topic = 'app';
CreateCommand.id = 'create';
CreateCommand.usagePrefix = `${`mobile ${CreateCommand.topic}:${CreateCommand.id}`.bold.yellow} my-app-name`;

// dump(flags);

CreateCommand.examples = `
${`Create app from template in npm package`.underline}

${CreateCommand.usagePrefix} [@scope/]<name>
${CreateCommand.usagePrefix} [@scope/]<name>@<tag>
${CreateCommand.usagePrefix} [@scope/]<name>@<version>
${CreateCommand.usagePrefix} [@scope/]<name>@<version range>

${`Create app from template in github repo`.underline}

${CreateCommand.usagePrefix} <git-host>:<git-user>/<repo-name>
${CreateCommand.usagePrefix} <git-host>:<git-user>/<repo-name>#<tag>
${CreateCommand.usagePrefix} <git-host>:<git-user>/<repo-name>#<branch>
${CreateCommand.usagePrefix} <git repo url>

${`(where <git-host> can be: github, bitbucket, or gitlab)`.italic}

${`Create app from template in tarball`.underline}

${CreateCommand.usagePrefix} <tarball file>
${CreateCommand.usagePrefix} <tarball url>

${`Create app from template in local directory`.underline}

${CreateCommand.usagePrefix} <folder>

`;


CreateCommand.args = [
	{
		name:        'name',
		required:    false,
		description: 'Name of your project',
	},
	{
		name:        'template',
		required:    false,
		description: 'Template to use for creating your new app',
	},
];

CreateCommand.flags = {
	template: flags.string({
		char:        't',
		description: '[default: @titanium/template-alloy-default] Template to use for creating your new app',
		required:    false,
	}),
	id: flags.string({
		char:        'i',
		description: '[default: Generate from project name] ID for your project',
		required:    false,
	}),
	name: flags.string({
		char:        'n',
		description: 'Name of your project',
		required:    false,
	}),
	publisher: flags.string({
		char:        'p',
		description: 'Name of person/company publishing app',
		required:    false,
	}),
	copyright: flags.string({
		char:        'c',
		description: 'Copyright for your project',
		required:    false,
	}),
	description: flags.string({
		char:        'd',
		description: 'Description for your project',
		required:    false,
	}),
	url: flags.string({
		char:        'u',
		description: 'URL for your project',
		required:    false,
	}),
	path: flags.string({
		char:        'p',
		description: 'Specifies the directory where you want to initialize the project',
		required:    false,
	}),
	license: flags.string({
		char:        'l',
		description: 'Specifies the license for the project',
		required:    false,
		default:     'MIT',
	}),
};

module.exports = CreateCommand;
