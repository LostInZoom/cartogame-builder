import * as fs from 'fs';
import { load } from "js-yaml";
import express from 'express';

const file = fs.readFileSync('./server/configuration.yml', { encoding: 'utf-8' });
const params = load(file);

const app = express()
const port = 8002
const __dirname = import.meta.dirname;

app.use('/cartogame-builder/configuration', (req, res) => {
	res.json(params);
	return res;
});

app.use('/', express.static('dist'));

app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})