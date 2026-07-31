
let trainingComplete = false;

async function submitObjectives() {
    if (trainingComplete) {
        alert("Training is already complete!");
        window.location.href = '/amlro_dashboard';
    }

    const objValuesInput = Array.from(document.querySelectorAll('#objectiveInputs input'))
        .map(input => parseFloat(input.value));
    
    const allValid = objValuesInput.every(value => value !== '' && !isNaN(parseFloat(value)));

    
    if (!allValid) {
            alert('Please fill all the input fields with valid numbers before proceeding.');
            return;
    }
    
    const parameterRow = document.getElementById('parameterSet').children;
    const currentParameters = Array.from(parameterRow).map(td => td.textContent);

    const currentData = {
        parameters: currentParameters,
        objectives: objValuesInput
    };

    const response = await fetch('/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obj_values: objValuesInput, completed_data: currentData })
    });

    const result = await response.json();

    updateCompletedDataTable(result.completed_data)

    if (result.complete) {
        trainingComplete = true;
        alert(result.message);
        document.getElementById('nextButton').textContent = "Completed";
        document.getElementById('parameterTable').style.display = 'none';
        document.getElementById('objectiveTable').style.display = 'none';
        document.getElementById('nextButton').onclick = () => window.location.href = '/amlro_dashboard';
    } else {
        updateParameterTable(result.parameters);
        document.getElementById('currentIteration').textContent = result.current_iteration + 1;
        clearObjectiveInputs();
    }
}

function updateParameterTable(parameters) {
    const parameterRow = document.getElementById('parameterSet');
    parameterRow.innerHTML = parameters.map(value => `<td>${value}</td>`).join('');
}


function clearObjectiveInputs() {
    const container = document.getElementById('objectiveInputs');
    if (container) {
        
        const objectiveInputs = container.querySelectorAll('input[type="number"]');
        objectiveInputs.forEach(input => {
            input.value = '';  
        });
    }
}

function updateCompletedDataTable(completedData) {
    // Get the table body
    const completedTableBody = document.getElementById('completedDataBody');

    // Create a new table row
    const row = document.createElement('tr');

    // Add parameters as table cells
    completedData.parameters.forEach(param => {
        const cell = document.createElement('td');
        cell.textContent = param;
        row.appendChild(cell);
    });

    // Add objectives as table cells
    completedData.objectives.forEach(obj => {
        const cell = document.createElement('td');
        cell.textContent = obj;
        row.appendChild(cell);
    });

    // Append the new row to the table body
    completedTableBody.appendChild(row);
}


    