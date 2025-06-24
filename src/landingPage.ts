const STYLESHEET = `
* {
	box-sizing: border-box;
}

body,
html {
	margin: 0;
	padding: 0;
	width: 100%;
	min-height: 100%;
}

body {
	padding: 2vh;
	font-size: 2.2vh;
}

html {
	background-size: auto 100%;
	background-size: cover;
	background-position: center center;
	background-repeat: no-repeat;
	box-shadow: inset 0 0 0 2000px rgb(0 0 0 / 60%);
}

body {
	display: flex;
	font-family: 'Open Sans', Arial, sans-serif;
	color: white;
}

h1 {
	font-size: 4.5vh;
	font-weight: 700;
}

h2 {
	font-size: 2.2vh;
	font-weight: normal;
	font-style: italic;
	opacity: 0.8;
}

h3 {
	font-size: 2.2vh;
}

h1,
h2,
h3,
p {
	margin: 0;
	text-shadow: 0 0 1vh rgba(0, 0, 0, 0.15);
}

p {
	font-size: 1.75vh;
}

ul {
	font-size: 1.75vh;
	margin: 0;
	margin-top: 1vh;
	padding-left: 3vh;
}

a {
	color: white
}

a.install-link {
	text-decoration: none
}

button {
	border: 0;
	outline: 0;
	color: white;
	background: #8A5AAB;
	padding: 1.2vh 3.5vh;
	margin: auto;
	text-align: center;
	font-family: 'Open Sans', Arial, sans-serif;
	font-size: 2.2vh;
	font-weight: 600;
	cursor: pointer;
	display: block;
	box-shadow: 0 0.5vh 1vh rgba(0, 0, 0, 0.2);
	transition: box-shadow 0.1s ease-in-out;
}

button:hover {
	box-shadow: none;
}

button:active {
	box-shadow: 0 0 0 0.5vh white inset;
}

#addon {
	width: 40vh;
	margin: auto;
}

.logo {
	height: 14vh;
	width: 14vh;
	margin: auto;
	margin-bottom: 3vh;
}

.logo img {
	width: 100%;
}

.name, .version {
	display: inline-block;
	vertical-align: top;
}

.name {
	line-height: 5vh;
	margin: 0;
}

.version {
	position: relative;
	line-height: 5vh;
	opacity: 0.8;
	margin-bottom: 2vh;
}

.contact {
	position: absolute;
	left: 0;
	bottom: 4vh;
	width: 100%;
	text-align: center;
}

.contact a {
	font-size: 1.4vh;
	font-style: italic;
}

.separator {
	margin-bottom: 4vh;
}

.form-element {
	margin-bottom: 2vh;
}

.label-to-top {
	margin-bottom: 2vh;
}

.label-to-right {
	margin-left: 1vh !important;
}

.full-width {
	width: 100%;
}
`

function landingTemplate(manifest: any) {
	const background = manifest.background || 'https://dl.strem.io/addon-background.jpg'
	const logo = manifest.logo || 'https://dl.strem.io/addon-logo.png'
	const contactHTML = manifest.contactEmail ?
		`&lt;div class="contact"&gt;
			&lt;p&gt;Contact ${manifest.name} creator:&lt;/p&gt;
			&lt;a href="mailto:${manifest.contactEmail}"&gt;${manifest.contactEmail}&lt;/a&gt;
		&lt;/div&gt;` : ''

	const stylizedTypes = manifest.types
		.map((t: string) => t[0].toUpperCase() + t.slice(1) + (t !== 'series' ? 's' : ''))

	let formHTML = ''
	let script = ''

	if ((manifest.config || []).length) {
		let options = ''
		manifest.config.forEach((elem: any) => {
			const key = elem.key
			if (['text', 'number', 'password'].includes(elem.type)) {
				// elem.required è già un booleano grazie alla correzione in addon.ts
				const isRequired = elem.required ? ' required' : ''
				const defaultHTML = elem.default ? ` value="${elem.default}"` : ''
				const inputType = elem.type
				options += `
				&lt;div class="form-element"&gt;
					&lt;div class="label-to-top"&gt;${elem.title}&lt;/div&gt;
					&lt;input type="${inputType}" id="${key}" name="${key}" class="full-width"${defaultHTML}${isRequired}/&gt;
				&lt;/div&gt;
				`
			} else if (elem.type === 'checkbox') {
				const isChecked = elem.default === 'checked' ? ' checked' : ''
				options += `
				&lt;div class="form-element"&gt;
					&lt;label for="${key}"&gt;
						&lt;input type="checkbox" id="${key}" name="${key}"${isChecked}&gt; &lt;span class="label-to-right"&gt;${elem.title}&lt;/span&gt;
					&lt;/label&gt;
				&lt;/div&gt;
				`
			} else if (elem.type === 'select') {
				const defaultValue = elem.default || (elem.options || [])[0]
				options += `&lt;div class="form-element"&gt;
				&lt;div class="label-to-top"&gt;${elem.title}&lt;/div&gt;
				&lt;select id="${key}" name="${key}" class="full-width"&gt;
				`
				const selections = elem.options || []
				selections.forEach((el: string) => {
					const isSelected = el === defaultValue ? ' selected' : ''
					options += `&lt;option value="${el}"${isSelected}&gt;${el}&lt;/option&gt;`
				})
				options += `&lt;/select&gt;
               &lt;/div&gt;
               `
			}
		})
		if (options.length) {
			formHTML = `
			&lt;form class="pure-form" id="mainForm"&gt;
				${options}
			&lt;/form&gt;

			&lt;div class="separator"&gt;&lt;/div&gt;
			`
			script += `
			installLink.onclick = () => {
				return mainForm.reportValidity()
			}
			const updateLink = () => {
				const config = Object.fromEntries(new FormData(mainForm))
				installLink.href = 'stremio://' + window.location.host + '/' + encodeURIComponent(JSON.stringify(config)) + '/manifest.json'
			}
			mainForm.onchange = updateLink
			`
		}
	}

	return `
	&lt;!DOCTYPE html&gt;
	&lt;html style="background-image: url(${background});"&gt;

	&lt;head&gt;
		&lt;meta charset="utf-8"&gt;
		&lt;title&gt;${manifest.name} - Stremio Addon&lt;/title&gt;
		&lt;style&gt;${STYLESHEET}&lt;/style&gt;
		&lt;link rel="shortcut icon" href="${logo}" type="image/x-icon"&gt;
		&lt;link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap" rel="stylesheet"&gt;
		&lt;link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/purecss@2.1.0/build/pure-min.css" integrity="sha384-yHIFVG6ClnONEA5yB5DJXfW2/KC173DIQrYoZMEtBvGzmf0PKiGyNEqe9N6BNDBH" crossorigin="anonymous"&gt;
	&lt;/head&gt;

	&lt;body&gt;
		&lt;div id="addon"&gt;
			&lt;div class="logo"&gt;
			&lt;img src="${logo}"&gt;
			&lt;/div&gt;
			&lt;h1 class="name"&gt;${manifest.name}&lt;/h1&gt;
			&lt;h2 class="version"&gt;v${manifest.version || '0.0.0'}&lt;/h2&gt;
			&lt;h2 class="description"&gt;${manifest.description || ''}&lt;/h2&gt;

			&lt;div class="separator"&gt;&lt;/div&gt;

			&lt;h3 class="gives"&gt;This addon has more :&lt;/h3&gt;
			&lt;ul&gt;
			${stylizedTypes.map((t: string) => `&lt;li&gt;${t}&lt;/li&gt;`).join('')}
			&lt;/ul&gt;

			&lt;div class="separator"&gt;&lt;/div&gt;

			${formHTML}

			&lt;a id="installLink" class="install-link" href="#"&gt;
			&lt;button name="Install"&gt;INSTALL&lt;/button&gt;
			&lt;/a&gt;
			${contactHTML}
		&lt;/div&gt;
		&lt;script&gt;
			${script}

			if (typeof updateLink === 'function')
			updateLink()
			else
			installLink.href = 'stremio://' + window.location.host + '/manifest.json'
		&lt;/script&gt;
	&lt;/body&gt;

	&lt;/html&gt;`
}

export { landingTemplate };
