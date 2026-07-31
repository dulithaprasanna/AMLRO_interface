let optimizationComplete = false;

function updateBatchSize() {
    const newSize = document.getElementById('newBatchSize').value;
    fetch('/update_batch_size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: newSize })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            document.getElementById('currentBatchSize').textContent = data.new_batch_size;
            alert('Batch size updated successfully');
        } else {
            alert('Failed to update batch size');
        }
    });
}

function validateInputs() {
    const inputs = document.querySelectorAll('.objective-input');
    let isValid = true;
    let errorMessage = '';

    inputs.forEach(input => {
        if (input.value.trim() === '') {
            input.classList.add('error');
            isValid = false;
            errorMessage = 'Please fill in all objective values.';
        } else {
            input.classList.remove('error');
        }
    });

    document.getElementById('errorMessage').textContent = errorMessage;
    return isValid;
}


async function submitPrediction(stop) {
    if (optimizationComplete) {
        alert("Optimization is already complete!");
        return;
    }

    if (!validateInputs()) {
        return;
    }

    const loadingMsg = document.getElementById('loadingMessage');
    loadingMsg.style.display = 'flex';

    const objectiveSets = [];
    const parameterSets = [];
    const dataContainer = document.getElementById('dataContainer');
    const objectiveCount = parseInt(dataContainer.dataset.objectiveCount);

    const rows = document.querySelectorAll("#parameterTable tbody tr");

    rows.forEach(row => {
        const parameterSet = [];
        const objectiveSet = [];

        // Get parameter values (static td OR input fields)
        const paramCells = row.querySelectorAll("td:not(:first-child):not(:last-child):not(:has(input))");
        paramCells.forEach(cell => {
            const value = cell.textContent.trim();
            parameterSet.push(isNaN(parseFloat(value)) ? value : parseFloat(value));
        });

        // Get parameter input fields (if any new rows added)
        const paramInputs = row.querySelectorAll("td:not(:first-child):not(:last-child) .param-input");
        paramInputs.forEach(input => {
            const value = input.value.trim();
            
            // If the value is a valid number, store it as a float; otherwise, keep it as a string
            if (!isNaN(value) && value !== "") {
                parameterSet.push(parseFloat(value));
            } else {
                parameterSet.push(value); // Keep categorical values as strings
            }
        });

        // Get objective values (from input fields)
        const objectiveInputs = row.querySelectorAll(".objective-input");
        objectiveInputs.forEach(input => {
            objectiveSet.push(parseFloat(input.value));
        });

        parameterSets.push(parameterSet);
        objectiveSets.push(objectiveSet);
    });

    const response = await fetch('/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            objectives: objectiveSets,
            parameters: parameterSets,
            stop: stop
        })
    });

    const result = await response.json();

    if (result.complete) {
        optimizationComplete = true;
        alert(result.message);
        document.getElementById('predictButton').style.display = 'none';
        document.getElementById('stopButton').textContent = "Return to Dashboard";
        document.getElementById('stopButton').onclick = () => window.location.href = '/';
    } else {
        // Update table with new parameter sets
        
        const tableBody = document.querySelector('#parameterTable tbody');
        document.getElementById('currentIteration').textContent = result.current_iteration + 1;
        tableBody.innerHTML = result.parameters.map((paramSet, batchIndex) => `
            <tr>
                <td>${batchIndex + 1}</td>
                ${paramSet.map((value, featureIndex) => `<td data-batch="${batchIndex}" data-parameter="${featureIndex}">${value}</td>`).join('')}
                ${Array(objectiveCount).fill().map((_, objIndex) => `
                    <td>
                        <input type="number" class="objective-input" data-batch="${batchIndex}" data-objective="${objIndex}" step="any" required>
                    </td>
                `).join('')}
                <td><button class="btn btn-danger" onclick="deleteRow(this)">x</button></td>
            </tr>
        `).join('');
        loadingMsg.style.display = 'none';
    }
    
    
}

let rowToDelete = null;

function deleteRow(button) {
    // Save the row reference
    rowToDelete = button.closest("tr");

    // Show the confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
}

// Handle actual deletion when user confirms
document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
    if (rowToDelete) {
        rowToDelete.remove();
        rowToDelete = null;
    }

    // Hide the modal after deletion
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    modal.hide();
});

function addRow() {
    const table = document.getElementById("parameterTable").getElementsByTagName('tbody')[0];
    const rowCount = table.rows.length + 1; // Get new row index
    const dataContainer = document.getElementById("dataContainer");
    const featureCount = parseInt(dataContainer.dataset.featureCount);
    const objectiveCount = parseInt(dataContainer.dataset.objectiveCount);

    let newRow = `<tr><td>${rowCount}</td>`;

    // Add input fields for parameters
    for (let i = 0; i < featureCount; i++) {
        newRow += `<td><input type="text" class="param-input" required></td>`;
    }

    // Add input fields for objectives
    for (let i = 0; i < objectiveCount; i++) {
        newRow += `<td><input type="number" class="objective-input" step="any" required></td>`;
    }

    // Add delete button
    newRow += `<td><button class="btn btn-danger" onclick="deleteRow(this)">x</button></td></tr>`;

    table.insertAdjacentHTML("beforeend", newRow);
}