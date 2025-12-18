const express = require('express');
const config = require('./config');
//const cron = require('node-cron');
const path = require('path');
const multer = require('multer');
const { spawn } = require('child_process');
const app = express();
//////
const uploadFolder = path.join(__dirname, 'uploads');
const outputFolder = path.join(__dirname, 'outputs');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + ".mp4");
    }
});
const upload = multer({ storage: storage });

let progressClients = [];
//////
app.use(express.static('public'));
app.use(express.json());
app.use("/outputs", express.static(path.join(__dirname, "outputs")));
//////
app.get('/', (req, res) => { //serve homepage
    res.sendFile(__dirname + '/public/home-deface.html');
});
app.post('/upload', upload.single('video'), (req, res) => { //file upload endpoint
    if (!req.file) {
        return res.status(400).json({ ok: false, message: 'No file uploaded.' });
    }
    const inputPath = req.file.path;
    const outputName = 'defaced-' + req.file.filename;
    const outputPath = path.join(outputFolder, outputName);
    const pythonPath = config.pythonPath
    let lastProgress = 0;
    const args = [inputPath, "-o", outputPath, "--backend", "onnxrt", "--execution-provider", "DmlExecutionProvider"];
    //const args = [inputPath, "-o", outputPath];

    const childProcess = spawn(config.pythonPath, args);


    childProcess.stdout.on("data", data => {
        const pythonOutput = data.toString().trim();
        console.log("DEFACE SERVER OUTPUT:", pythonOutput);
        const match = pythonOutput.match(/^(\d{1,3})%/m);
        if (match) {
            const progress = Number(match[1]);
            if (progress !== lastProgress) {
                lastProgress = progress;
                progressClients.forEach(res => {
                    res.write(`data: ${progress}\n\n`);
                });
            }
        }
    });

    childProcess.stderr.on("data", data => {
        console.error("DEFACE SERVER ERROR:", data.toString());
        const pythonOutput = data.toString().trim();
        const match = pythonOutput.match(/^(\d{1,3})%/m);
        if (match) {
            const progress = Number(match[1]);
            if (progress !== lastProgress) {
                lastProgress = progress;
                progressClients.forEach(res => {
                    res.write(`data: ${progress}\n\n`);
                });
            }
        }
    });

    childProcess.on("close", code => {
        if (code === 0) {
            console.log("Deface terminato con successo.");
            return res.json({ ok: true, outputName, url: `/outputs/${outputName}` });
        } else {
            return res.status(500).json({ ok: false, message: "Errore durante l'anonimizzazione." });
        }
    });
});

app.get('/download/:filename', (req, res) => { //file download endpoint

    const filename = req.params.filename;
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
        return res.status(400).json({ ok: false, message: "Invalid filename" });
    }
    const filePath = path.join(outputFolder, filename);

    return res.download(filePath, fileName, err => {
        if (err) {
            return res.status(500).json({ ok: false, message: "Errore durante il download del file." });
        }
    })

});
app.get("/progress", (req, res) => { //progress endpoint

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write("\n");
    progressClients.push(res);
    req.on("close", () => {
        console.log("Progress client disconnected");
        progressClients = progressClients.filter(client => client !== res);
    });
});
//////
app.listen(3100, () => { //start server

    console.log(`
    ██████╗ ███████╗███████╗ █████╗  ██████╗ ███████╗
    ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝ ██╔════╝
    ██║  ██║█████╗  █████╗  ███████║██║      █████╗  
    ██║  ██║██╔══╝  ██╔══╝  ██╔══██║██║      ██╔══╝  
    ██████╔╝███████╗██║     ██║  ██║╚██████╔╝███████╗
    ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
    Powered by TW2 Deface Module
    `);
    console.log('Server is running on port 3100');
    console.log("http://localhost:3100");
});
