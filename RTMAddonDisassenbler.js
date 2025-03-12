const fs = require('fs');
const path = require('path');

const TARGET_DIR = './'
const IGNORELIST = [
    'package.json',
    'sounds.json'
];

const files = fs.readdirSync(TARGET_DIR, { recursive: true });

let jsons = getJsonFile(files);

jsons = filterFiles(jsons, IGNORELIST);

let trainInfos = []
for (const json of jsons) {
    trainInfos.push(getTrainInfo(json));
}

for (const trainInfo of trainInfos) {
    // console.log(trainInfo)
    editMatData(trainInfo);
}

// const modelFiles = getFileByExtName(files, '.mqo');

// console.log(modelFiles)

function getJsonFile(files) {
    const result = [];
    for (const file of files) {
        const parsed = path.parse(file)
        if (parsed.ext === '.json' && parsed.name.startsWith('ModelTrain_')) result.push(file);
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
        console.error(`Unsupportted JSON format: trainModel2 is not defined at ${path.parse(file).base}`);
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
    // console.log('editing mat data')
    // console.log(`editMatData was called: ${path.join(TARGET_DIR, 'assets/minecraft/models/', trainInfo.modelFile)}`)
    const content = fs.readFileSync(path.join(TARGET_DIR, 'assets/minecraft/models/', trainInfo.modelFile), { encoding: 'utf-8' })

    const lines = content.split('\r\n');
    const edited = [];

    let readingMaterials = false;

    for (const line of lines) {

        if (line.startsWith('Material ')) {
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
            // console.log(data)
            // console.log(trainInfo.textures[0])
            // try {
            const matName = data[0].replaceAll('"', '');
            // } catch (error) {
            //     console.error(error)
            //     console.log(line);
            //     console.log(trainInfo.modelFile);

            //     process.exit(1);
            // }

            // console.log(matName)

            const textures = trainInfo.textures;

            for (const texture of textures) {
                if (matName !== texture.mat) continue;

                const texIndex = data.findIndex(e => e.startsWith('tex('));

                const texPath = `tex("${getPathFromModelToTex(trainInfo.modelFile, texture.path)}")`;

                if (texIndex === -1) { // JavaScriptでは、配列の負の添字に代入してもエラーを起こさない なぜならば、全てオブジェクトだから。
                    data.push(texPath);
                } else {
                    data[texIndex] = texPath;
                }

                // console.log(texture.path, trainInfo.modelFile);
                // console.log(getPathFromModelToTex(trainInfo.modelFile, texture.path))



                const newData = `\t${data.join(' ')}`;
                edited.push(newData);
            }
            continue;
        }

        edited.push(line);
    }

    const result = edited.join('\r\n');
    const editedModelFile = path.join(path.dirname(trainInfo.modelFile), `[DISASSEMBLED]${path.basename(trainInfo.modelFile)}`);

    fs.writeFileSync(path.join(TARGET_DIR, 'assets/minecraft/models/', editedModelFile), result);
    console.log(`Generated disassembled MQO File: ${path.join('assets/minecraft/models/', editedModelFile)}\n`);

}

function parseMaterialData(mat) {
    const regex = /"[^"]*"|\w+\([^)]*\)|\w+/g;
    return mat.match(regex) || [];
}

function getPathFromModelToTex(modelPath, texPath) {

    const baseDir = path.resolve('./assets/minecraft/models');
    const fileModelPath = path.join(baseDir, modelPath);
    const filetexPath = path.join(baseDir, '..', texPath);

    return path.relative(path.dirname(fileModelPath), filetexPath);
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