let continuousFeatureCount = 0;
let categoricalFeatureCount = 0;
let objectiveCount = 0;
//let expDir;

function addContinuousFeature() {
    const container = document.getElementById('continuousFeatures');
    const featureDiv = document.createElement('div');
    featureDiv.innerHTML = `
        <input type="text" placeholder="Feature Name" id="contName${continuousFeatureCount}">
        <input type="number" placeholder="Min Bound" id="contMin${continuousFeatureCount}">
        <input type="number" placeholder="Max Bound" id="contMax${continuousFeatureCount}">
        <input type="number" placeholder="Resolution" id="contRes${continuousFeatureCount}">
        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'continuous')">x</button>
    `;
    container.appendChild(featureDiv);
    continuousFeatureCount++;
}

function addCategoricalFeature() {
    const container = document.getElementById('categoricalFeatures');
    const featureDiv = document.createElement('div');
    featureDiv.innerHTML = `
        <input type="text" placeholder="Feature Name" id="catName${categoricalFeatureCount}">
        <input type="text" placeholder="Values (comma-separated)" id="catValues${categoricalFeatureCount}">
        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'categorical')">x</button>
    `;
    container.appendChild(featureDiv);
    categoricalFeatureCount++;
}

function addObjective() {
    const container = document.getElementById('objectives');
    const objectiveDiv = document.createElement('div');
    objectiveDiv.innerHTML = `
        <input type="text" placeholder="Objective Name" id="objName${objectiveCount}">
        <select id="objDirection${objectiveCount}">
            <option value="min">Minimize</option>
            <option value="max">Maximize</option>
        </select>
        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'objective')">x</button>
    `;
    container.appendChild(objectiveDiv);
    objectiveCount++;
}

function deleteFeatureRow(button, type) {
    const container = button.parentElement.parentElement; // Get the container
    button.parentElement.remove(); // Remove the selected row

    // Reassign IDs based on the type
    const rows = container.children;
    for (let i = 0; i < rows.length; i++) {
        if (type === 'continuous') {
            rows[i].querySelector('input[placeholder="Feature Name"]').id = `contName${i}`;
            rows[i].querySelector('input[placeholder="Min Bound"]').id = `contMin${i}`;
            rows[i].querySelector('input[placeholder="Max Bound"]').id = `contMax${i}`;
            rows[i].querySelector('input[placeholder="Resolution"]').id = `contRes${i}`;
        } else if (type === 'categorical') {
            rows[i].querySelector('input[placeholder="Feature Name"]').id = `catName${i}`;
            rows[i].querySelector('input[placeholder="Values (comma-separated)"]').id = `catValues${i}`;
        } else if (type === 'objective') {
            rows[i].querySelector('input[placeholder="Objective Name"]').id = `objName${i}`;
            rows[i].querySelector('select').id = `objDirection${i}`;
        }
    }

    // Update the corresponding count variables
    if (type === 'continuous') {
        continuousFeatureCount = rows.length;
    } else if (type === 'categorical') {
        categoricalFeatureCount = rows.length;
    } else if (type === 'objective') {
        objectiveCount = rows.length;
    }
}

// document.getElementById('expDirButton').addEventListener('click', async () => {
//     try {
//         const dirHandle = await window.showDirectoryPicker();
//         expDir = dirHandle;
//         document.getElementById('selectedFolder').textContent = dirHandle.name;
//     } catch (err) {
//         console.error('An error occurred selecting the directory:', err);
//     }
// });

function submitConfig() {
    const config = {
        continuous: {
            bounds: [],
            resolutions: [],
            feature_names: []
        },
        categorical: {
            feature_names: [],
            values: []
        },
        directions: [],
        objectives: [],
        sampling: document.getElementById('sampling').value,
        training_size: parseInt(document.getElementById('trainingSize').value) || 10,
        regresor_model: document.getElementById('regressorModel').value,
        exp_dir: document.getElementById('expDir').value,
        //exp_dir:  expDir ? expDir.name : 'default_exp_dir';
        file_name: document.getElementById('fileName').value || "reaction_data.csv",
        batch_size: parseInt(document.getElementById('batchSize').value) || 1,
    };

    // Collect continuous features
    for (let i = 0; i < continuousFeatureCount; i++) {
        const name = document.getElementById(`contName${i}`).value;
        const min = parseFloat(document.getElementById(`contMin${i}`).value);
        const max = parseFloat(document.getElementById(`contMax${i}`).value);
        const res = parseFloat(document.getElementById(`contRes${i}`).value);
        
        if (!name || isNaN(min) || isNaN(max) || isNaN(res)) {
            alert('Please fill out all Continuous Feature fields.');
            return;
        }
        config.continuous.feature_names.push(name);
        config.continuous.bounds.push([min, max]);
        config.continuous.resolutions.push(res);

    }

    // Collect categorical features
    for (let i = 0; i < categoricalFeatureCount; i++) {
        const name = document.getElementById(`catName${i}`).value;
        const values = document.getElementById(`catValues${i}`).value.split(',').map(v => v.trim());;

        if (!name || !values) {
            alert('Please fill out all Categorical Feature fields.',values);
            return;
        }

        config.categorical.feature_names.push(name);
        config.categorical.values.push(values);

    }

    // Collect objectives
    for (let i = 0; i < objectiveCount; i++) {
        const name = document.getElementById(`objName${i}`).value;
        const direction = document.getElementById(`objDirection${i}`).value;

        if (!name) {
            alert('Please fill out all Objective fields.');
            return;
        }
        config.objectives.push(name);
        config.directions.push(direction);

    }

    // Validation: Ensure at least one feature or objective is defined
    if (
        (config.continuous.feature_names.length === 0 &&
        config.categorical.feature_names.length === 0) ||
        config.objectives.length === 0
    ) {
        alert("Please add at least one feature (continuous or categorical) and one objective.");
        return; 
    }
    const exp_dir = document.getElementById(`expDir`).value;
    if (!exp_dir){
        alert("Please add the new experiment directory");
        return; 
    }

    // Send config to server
    fetch('/reaction_scope', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                window.location.href = '/amlro_dashboard';
            } else {
                alert('Error saving configuration');
            }
        }).catch(err => console.error('Error:', err));
}

//Load old config data file and populated into the reaction_scope.html fields

function loadConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (file) {
            try {
                const text = await file.text();
                const config = JSON.parse(text);

                // Populate Continuous Features
                continuousFeatureCount = config.continuous.feature_names.length;
                const continuousContainer = document.getElementById('continuousFeatures');
                continuousContainer.innerHTML = ''; // Clear existing
                config.continuous.feature_names.forEach((name, i) => {
                    const min = config.continuous.bounds[i][0];
                    const max = config.continuous.bounds[i][1];
                    const res = config.continuous.resolutions[i];
                    const featureDiv = document.createElement('div');
                    featureDiv.innerHTML = `
                        <input type="text" placeholder="Feature Name" id="contName${i}" value="${name}">
                        <input type="number" placeholder="Min Bound" id="contMin${i}" value="${min}">
                        <input type="number" placeholder="Max Bound" id="contMax${i}" value="${max}">
                        <input type="number" placeholder="Resolution" id="contRes${i}" value="${res}">
                        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'continuous')">x</button>
                    `;
                    continuousContainer.appendChild(featureDiv);
                });

                // Populate Categorical Features
                categoricalFeatureCount = config.categorical.feature_names.length;
                const categoricalContainer = document.getElementById('categoricalFeatures');
                categoricalContainer.innerHTML = ''; // Clear existing
                config.categorical.feature_names.forEach((name, i) => {
                    const values = config.categorical.values[i].join(', ');
                    const featureDiv = document.createElement('div');
                    featureDiv.innerHTML = `
                        <input type="text" placeholder="Feature Name" id="catName${i}" value="${name}">
                        <input type="text" placeholder="Values (comma-separated)" id="catValues${i}" value="${values}">
                        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'categorical')">x</button>
                    `;
                    categoricalContainer.appendChild(featureDiv);
                });

                // Populate Objectives
                objectiveCount = config.objectives.length;
                const objectivesContainer = document.getElementById('objectives');
                objectivesContainer.innerHTML = ''; // Clear existing
                config.objectives.forEach((obj, i) => {
                    const direction = config.directions[i];
                    const objectiveDiv = document.createElement('div');
                    objectiveDiv.innerHTML = `
                        <input type="text" placeholder="Objective Name" id="objName${i}" value="${obj}">
                        <select id="objDirection${i}">
                            <option value="min" ${direction === 'min' ? 'selected' : ''}>Minimize</option>
                            <option value="max" ${direction === 'max' ? 'selected' : ''}>Maximize</option>
                        </select>
                        <button class="btn btn-danger delete-btn" onclick="deleteFeatureRow(this,'objective')">x</button>
                    `;
                    objectivesContainer.appendChild(objectiveDiv);
                });

                // Populate Other Settings
                document.getElementById('sampling').value = config.sampling;
                document.getElementById('trainingSize').value = config.training_size;
                document.getElementById('regressorModel').value = config.regresor_model;
                document.getElementById('fileName').value = config.file_name;
                document.getElementById('batchSize').value = config.batch_size;
                document.getElementById('expDir').value = '';

                alert('Configuration loaded successfully!');
            } catch (error) {
                console.error('Error loading config:', error);
                alert('Failed to load the configuration file.');
            }
        }
    });

    input.click();
}

