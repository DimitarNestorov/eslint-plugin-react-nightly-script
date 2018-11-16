const { execSync } = require('child_process')
const rimraf = require('rimraf')
const path = require('path')
const fs = require('fs')

function log(...args) {
	console.log(`[${new Date()}]`, ...args)
}

function getVersions() {
	try {
		return JSON.parse(execSync('npm view eslint-plugin-react-nightly versions -json', {
			encoding: 'utf8'
		}))
	} catch (exception) {
		log("Failed to get versions", exception)
		return []
	}
}

rimraf('eslint-plugin-react', (error) => {
	if (error) throw error

	execSync('git clone https://github.com/yannickcr/eslint-plugin-react.git')

	const repoPath = path.resolve(__dirname, 'eslint-plugin-react')

	const commits = execSync('git rev-list fb745abf5909f8f2409e232cb7e82a78e948a350..HEAD', {
		cwd: repoPath,
		encoding: 'utf8'
	}).split('\n').reverse()

	commits.shift() // Removing empty line
	log("Commits:", commits)

	const versions = getVersions()
	log("Versions:", versions)

	commits.forEach((hash) => {
		const version = `0.0.0-${hash}`
		if (versions.includes(version)) return log(`Version ${version} already published`)

		execSync('git clean -f', {cwd: repoPath})
		execSync(`git checkout -f ${hash}`, {cwd: repoPath})

		const packagePath = path.join(repoPath, 'package.json')
		const package = JSON.parse(fs.readFileSync(packagePath), 'utf8')
		package.version = version
		package.name = "eslint-plugin-react-nightly"
		fs.writeFileSync(packagePath, JSON.stringify(package))

		fs.copyFileSync(path.join(__dirname, 'TARGET.README.md'), path.join(repoPath, 'README.md'));

		fs.copyFileSync(path.join(__dirname, 'target.npmignore'), path.join(repoPath, '.npmignore'));

		log(`Publishing ${version}`)
		execSync('npm publish', {cwd: repoPath})
	})
})
