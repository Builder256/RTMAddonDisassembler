const fs = require('fs');
const path = require('path');

const TARGET_DIR = './'
const IGNORELIST = [
    'package.json'
];

const files = fs.readdirSync(TARGET_DIR, { recursive: true });

let jsons = getFileByExtName(files, '.json');

jsons = filterFiles(jsons, IGNORELIST);

let trainInfos = []
for (const json of jsons) {
    trainInfos.push(getTrainInfo(json));
}

for (const trainInfo of trainInfos) {
    // console.log(trainInfo)
    editMatData(trainInfo)
}

// const modelFiles = getFileByExtName(files, '.mqo');

// console.log(modelFiles)

function getFileByExtName(files, ext) {
    const result = [];
    for (const file of files) {
        if (path.parse(file).ext === ext) result.push(file);
    }
    return result;
}

function getTrainInfo(file) {
    // console.log(`~~~~~~~~~~${path.parse(file).base}~~~~~~~~~~`);
    const content = fs.readFileSync(path.join(TARGET_DIR, file), { encoding: 'utf-8' });
    const json = JSON.parse(content);

    let trainModel;

    if (json.trainModel2) {
        trainModel = json.trainModel2;
    } else {
        console.warn(`Unsupportted JSON format: trainModel2 is not defined at ${path.parse(file).base}`);
        process.exit(1);
    }

    const textures = trainModel.textures;
    let matInfo = [];
    for (const texture of textures) {
        matInfo.push({
            mat: texture[0],
            path: texture[1]
        });
    }

    const trainInfo = {
        modelFile: trainModel.modelFile,
        textures: matInfo
    };

    return trainInfo;
}

function editMatData(trainInfo) {
    console.log('editing mat data')
    // console.log(`editMatData was called: ${path.join(TARGET_DIR, 'assets/minecraft/models/', trainInfo.modelFile)}`)
    const content = fs.readFileSync(path.join(TARGET_DIR, 'assets/minecraft/models/', trainInfo.modelFile), { encoding: 'utf-8' })

    const lines = content.split('\r\n');
    const edited = [];

    let readingMaterials = false;

    for (let line of lines) {

        if (line.startsWith('Material')) {
            readingMaterials = true;
            edited.push(line);
            continue;
        }

        if (readingMaterials === true && line === '}') {
            readingMaterials = false;
            edited.push(line);
            continue;
        }

        if (readingMaterials) {
            const data = parseMaterialData(line);

        }
    }

}

function parseMaterialData(mat) {
    const regex = /"[^"]*"|\w+\([^)]*\)|\w+/g;
    return mat.match(regex) || [];
}

/**
 * ファイルパスのリストとファイル名のリストを受け取り、ファイルパスからファイル名と同じ名前のものを除いた配列を返す
 * @param {Array} paths フィルターされるファイルパスの配列
 * @param {Array} filenames フィルターするファイル名の配列
 * @returns フィルターするファイル名のパスが除かれたファイルパスの配列
 */
function filterFiles(paths, filenames) {
    return paths.filter(filePath => {
        const filename = path.basename(filePath);
        return !filenames.includes(filename);
    })
}