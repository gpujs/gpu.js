![Logo](http://gpu.rocks/img/ogimage.png)

[Link to website](http://gpu.rocks/)

**TODO: Write a README**

# HOWTO: Build / Generate Docs
- The following is required to be installed
	- node.js
	- ant
- `ant setup` Run the setup function once, this will do the following
	- `ant setup-gulp` Install gulp inside node.js global
	- `ant setup-naturalDocs` Download and NaturalDocs into the docs folder
- `ant build-docs` To build the HTML documentation inside doc folder
- `gulp` To build the gpu.js file inside bin folder
