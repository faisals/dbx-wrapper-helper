// Store generated scripts
let generatedScripts = [];
let scriptBoxCounter = 0;

// DOM Elements - declared globally
let scriptsContainer;
let addScriptBtn;
let generateAllBtn;
let scriptsList;
let downloadAllBtn;
let downloadAllContainer;
let startScriptNumberInput;

// Wrapper templates store
const wrapperTemplates = {
    // Default template used as fallback
    'default': `--------------------------------------------------------
-- DB_Change_ID:    {{SCRIPT_ID}}
-- DB_ASSET:        {{DB_ASSET}}
-- DB_RPE_VER:      {{RP_VERSION}}
-- Author:          {{AUTHOR}} 
------------------------------------------------------------
DECLARE @ErrorCount INT;
DECLARE @ShouldApply VARCHAR(5);
DECLARE @ScriptID VARCHAR(30);
DECLARE @NA VARCHAR(16) 
DECLARE @RPVer VARCHAR(16);
DECLARE @Asset VARCHAR(30);
SET @NA = 'NA' 


SET @ScriptID = '{{SCRIPT_ID}}';
SET @Asset = '{{DB_ASSET}}';
SET @RPVer = '{{RP_VERSION}}';



EXEC Usp_geterrorcount @ScriptID, @ErrorCount OUTPUT

IF (@ErrorCount = 0)
BEGIN
\t\tEXEC usp_ShouldApplyScript @ScriptID, @ShouldApply OUTPUT
\t\tIF (@ShouldApply='TRUE')
\t\t\tBEGIN TRY
\t\t\t\tBEGIN

------------------------------------------------------------
{{SQL_CONTENT}} 
----------------------------------------------------------

EXEC usp_HandleScriptApplied @ScriptID, @Asset, @NA, @NA, @NA, @RPVer, @NA, @NA;
END
END TRY
BEGIN CATCH
EXEC usp_HandleErrorApplyingScript @ScriptID,@Asset,@NA,@NA,@NA,@RPVer,@NA,@NA;
END CATCH;
ELSE
BEGIN
PRINT 'Skipping previously applied script: '+@ScriptID+'. Please refer DB_CHANGE_ID in DATABASE_UPDATES table.';
END
END
ELSE
PRINT 'Skipping script: '+@ScriptID+'. Previous error detected.'

GO`,
    // Templates for different database and script types
    'RPE_DML': null,
    'RPE_DDL': null,
    'INTR_DML': null,
    'INTR_DDL': null
};

// Function to load a wrapper template from an external file
async function loadWrapperTemplate(dbType, scriptType) {
    const templateKey = `${dbType}_${scriptType}`;
    
    try {
        const response = await fetch(`wrappers/${templateKey}.sql`);
        if (response.ok) {
            const templateText = await response.text();
            wrapperTemplates[templateKey] = templateText;
            console.log(`Loaded template for ${templateKey}`);
            return templateText;
        } else {
            console.warn(`Template file for ${templateKey} not found. Using default template.`);
            return wrapperTemplates['default'];
        }
    } catch (error) {
        console.error(`Error loading template for ${templateKey}:`, error);
        return wrapperTemplates['default'];
    }
}

// Function to get the appropriate template for a script
async function getScriptTemplate(dbType, scriptType) {
    const templateKey = `${dbType}_${scriptType}`;
    
    // If template is not loaded yet, try to load it
    if (!wrapperTemplates[templateKey]) {
        await loadWrapperTemplate(dbType, scriptType);
    }
    
    // Return the template or fall back to default
    return wrapperTemplates[templateKey] || wrapperTemplates['default'];
}

// Load all templates on page load
async function loadAllTemplates() {
    try {
        await Promise.all([
            loadWrapperTemplate('RPE', 'DML'),
            loadWrapperTemplate('RPE', 'DDL'),
            loadWrapperTemplate('INTR', 'DML'),
            loadWrapperTemplate('INTR', 'DDL')
        ]);
        console.log('All templates loaded or attempted to load');
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Get next script number based on starting script number
function getNextScriptNumber() {
    const startScriptNumber = startScriptNumberInput.value.trim() || '001';
    const currentScriptBoxes = document.querySelectorAll('.script-box').length;
    
    const baseNumber = parseInt(startScriptNumber, 10) || 1;
    const nextNumber = baseNumber + currentScriptBoxes;
    
    return nextNumber.toString().padStart(3, '0');
}

// Update all script numbers when the starting number changes
function updateAllScriptNumbers() {
    const startScriptNumber = startScriptNumberInput.value.trim() || '001';
    const baseNumber = parseInt(startScriptNumber, 10) || 1;
    
    const scriptBoxes = document.querySelectorAll('.script-box');
    scriptBoxes.forEach((box, index) => {
        const boxId = box.id.split('-')[2];
        const scriptNumberInput = document.getElementById(`script-number-${boxId}`);
        if (scriptNumberInput) {
            const newNumber = (baseNumber + index).toString().padStart(3, '0');
            scriptNumberInput.value = newNumber;
        }
    });
}

// Add a new script box
function addScriptBox() {
    scriptBoxCounter++;
    
    const scriptBox = document.createElement('div');
    scriptBox.className = 'script-box';
    scriptBox.id = `script-box-${scriptBoxCounter}`;
    
    const scriptBoxHeader = document.createElement('div');
    scriptBoxHeader.className = 'script-box-header';
    
    const scriptNumber = document.createElement('span');
    scriptNumber.className = 'script-number';
    scriptNumber.textContent = scriptBoxCounter;
    
    scriptBoxHeader.appendChild(scriptNumber);
    scriptBoxHeader.appendChild(document.createTextNode(`Script ${scriptBoxCounter}`));
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-script-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.title = 'Remove this script';
    removeBtn.setAttribute('aria-label', 'Remove script');
    removeBtn.addEventListener('click', function() {
        scriptsContainer.removeChild(scriptBox);
        updateScriptNumbers();
    });
    
    scriptBox.appendChild(scriptBoxHeader);
    scriptBox.appendChild(removeBtn);
    
    // Create HTML content for the script box
    const formContent = `
        <div class="form-row">
            <div class="form-control">
                <div class="form-group">
                    <label for="db-type-${scriptBoxCounter}">Database Type</label>
                    <select id="db-type-${scriptBoxCounter}">
                        <option value="INTR" selected>INTR</option>
                        <option value="RPE">RPE</option>
                    </select>
                </div>
            </div>
            <div class="form-control">
                <div class="form-group">
                    <label for="script-type-${scriptBoxCounter}">Script Type</label>
                    <select id="script-type-${scriptBoxCounter}">
                        <option value="DML" selected>DML (Data Manipulation)</option>
                        <option value="DDL">DDL (Data Definition)</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-control">
                <div class="form-group">
                    <label for="db-asset-${scriptBoxCounter}">DB Asset</label>
                    <input type="text" id="db-asset-${scriptBoxCounter}" placeholder="E.g. EI" value="EI">
                </div>
            </div>
            <div class="form-control">
                <div class="form-group">
                    <label for="rp-version-${scriptBoxCounter}">RP Version</label>
                    <input type="text" id="rp-version-${scriptBoxCounter}" placeholder="E.g. V3_12_02_00" value="V3_12_02_00">
                </div>
            </div>
            <div class="form-control">
                <div class="form-group">
                    <label for="script-number-${scriptBoxCounter}">Script Number</label>
                    <input type="text" id="script-number-${scriptBoxCounter}" placeholder="E.g. 001" value="${getNextScriptNumber()}">
                </div>
            </div>
        </div>
        <div class="form-group">
            <label for="sql-script-${scriptBoxCounter}">SQL Script Content <span style="color: #ef4444;">*</span></label>
            <textarea id="sql-script-${scriptBoxCounter}" placeholder="Paste your SQL code here..."></textarea>
        </div>
        <div class="form-group">
            <button id="preview-btn-${scriptBoxCounter}" class="btn btn-secondary">
                <i class="fas fa-eye"></i>
                Preview
            </button>
        </div>
        <div id="script-preview-${scriptBoxCounter}" class="script-preview hidden"></div>
    `;
    
    scriptBox.innerHTML += formContent;
    
    scriptsContainer.appendChild(scriptBox);
    
    // Add preview button event listener
    document.getElementById(`preview-btn-${scriptBoxCounter}`).addEventListener('click', function() {
        previewScript(scriptBoxCounter);
    });
    
    // Add change listeners for DB type and script type
    document.getElementById(`db-type-${scriptBoxCounter}`).addEventListener('change', function() {
        updatePreviewIfVisible(scriptBoxCounter);
    });
    
    document.getElementById(`script-type-${scriptBoxCounter}`).addEventListener('change', function() {
        updatePreviewIfVisible(scriptBoxCounter);
    });
}

// Update preview if it's already visible
function updatePreviewIfVisible(boxId) {
    const previewElement = document.getElementById(`script-preview-${boxId}`);
    if (!previewElement.classList.contains('hidden')) {
        previewScript(boxId);
    }
}

// Update script numbers after removing a script box
function updateScriptNumbers() {
    const scriptBoxes = document.querySelectorAll('.script-box');
    scriptBoxCounter = scriptBoxes.length;
    
    scriptBoxes.forEach((box, index) => {
        const number = index + 1;
        const scriptNumberElement = box.querySelector('.script-number');
        if (scriptNumberElement) {
            scriptNumberElement.textContent = number;
        }
        
        const headerText = box.querySelector('.script-box-header');
        if (headerText) {
            headerText.childNodes[1].textContent = `Script ${number}`;
        }
    });
    
    // Update the script numbers to maintain sequence
    updateAllScriptNumbers();
}

// Preview a script
async function previewScript(boxId) {
    const projectCode = document.getElementById('project-code').value.trim() || 'KY';
    const tfsTicket = document.getElementById('tfs-ticket').value.trim();
    
    if (!tfsTicket) {
        alert('Please enter a TFS Ticket Number.');
        return;
    }
    
    const scriptNumber = document.getElementById(`script-number-${boxId}`).value.trim() || '001';
    const dbType = document.getElementById(`db-type-${boxId}`).value;
    const scriptType = document.getElementById(`script-type-${boxId}`).value;
    const dbAsset = document.getElementById(`db-asset-${boxId}`).value.trim() || 'EI';
    const rpVersion = document.getElementById(`rp-version-${boxId}`).value.trim() || 'V3_12_02_00';
    const author = document.getElementById('author').value.trim() || 'Anonymous';
    const sqlContent = document.getElementById(`sql-script-${boxId}`).value.trim();
    
    if (!sqlContent) {
        alert('Please enter SQL content for your script.');
        return;
    }
    
    const scriptId = `${projectCode}${tfsTicket}.${scriptNumber}`;
    
    // Get appropriate template based on database and script type
    const template = await getScriptTemplate(dbType, scriptType);
    
    let script = template
        .replace(/{{SCRIPT_ID}}/g, scriptId)
        .replace(/{{DB_ASSET}}/g, dbAsset)
        .replace(/{{RP_VERSION}}/g, rpVersion)
        .replace(/{{AUTHOR}}/g, author)
        .replace(/{{SQL_CONTENT}}/g, sqlContent);
    
    const previewElement = document.getElementById(`script-preview-${boxId}`);
    previewElement.textContent = script;
    previewElement.classList.remove('hidden');
}

// Generate all scripts
async function generateAllScripts() {
    const projectCode = document.getElementById('project-code').value.trim() || 'KY';
    const tfsTicket = document.getElementById('tfs-ticket').value.trim();
    
    if (!tfsTicket) {
        alert('Please enter a TFS Ticket Number.');
        return;
    }
    
    const author = document.getElementById('author').value.trim() || 'Anonymous';
    const scriptBoxes = document.querySelectorAll('.script-box');
    
    if (scriptBoxes.length === 0) {
        alert('Please add at least one script.');
        return;
    }
    
    let newScripts = [];
    let invalidScripts = [];
    let generationPromises = [];
    
    // Create promises for all script generations
    scriptBoxes.forEach((box) => {
        const boxId = box.id.split('-')[2];
        const scriptNumber = document.getElementById(`script-number-${boxId}`).value.trim() || '001';
        const dbType = document.getElementById(`db-type-${boxId}`).value;
        const scriptType = document.getElementById(`script-type-${boxId}`).value;
        const dbAsset = document.getElementById(`db-asset-${boxId}`).value.trim() || 'EI';
        const rpVersion = document.getElementById(`rp-version-${boxId}`).value.trim() || 'V3_12_02_00';
        const sqlContent = document.getElementById(`sql-script-${boxId}`).value.trim();
        
        if (!sqlContent) {
            invalidScripts.push(boxId);
            return;
        }
        
        const scriptId = `${projectCode}${tfsTicket}.${scriptNumber}`;
        
        // Create a promise to generate this script with the correct template
        const generatePromise = async () => {
            const template = await getScriptTemplate(dbType, scriptType);
            
            const script = template
                .replace(/{{SCRIPT_ID}}/g, scriptId)
                .replace(/{{DB_ASSET}}/g, dbAsset)
                .replace(/{{RP_VERSION}}/g, rpVersion)
                .replace(/{{AUTHOR}}/g, author)
                .replace(/{{SQL_CONTENT}}/g, sqlContent);
            
            return {
                id: scriptId,
                content: script,
                dbType: dbType,
                scriptType: scriptType
            };
        };
        
        generationPromises.push(generatePromise());
    });
    
    if (invalidScripts.length > 0) {
        alert(`Please enter SQL content for script(s) ${invalidScripts.join(', ')}.`);
        return;
    }
    
    // Wait for all script generations to complete
    try {
        newScripts = await Promise.all(generationPromises);
        generatedScripts = [...generatedScripts, ...newScripts];
        renderScriptsList();
    } catch (error) {
        console.error('Error generating scripts:', error);
        alert('An error occurred while generating scripts. Please check the console for more information.');
    }
}

// Render generated scripts list
function renderScriptsList() {
    scriptsList.innerHTML = '';
    
    if (generatedScripts.length > 0) {
        downloadAllContainer.classList.remove('hidden');
    } else {
        downloadAllContainer.classList.add('hidden');
        scriptsList.innerHTML = '<div style="text-align: center; color: var(--medium-text); padding: 2rem 0;">No scripts generated yet. Fill in the script details and click "Generate All Scripts".</div>';
        return;
    }
    
    generatedScripts.forEach((script, index) => {
        const scriptItem = document.createElement('div');
        scriptItem.className = 'script-item';
        
        const scriptHeader = document.createElement('div');
        scriptHeader.className = 'script-header';
        
        const scriptTitle = document.createElement('div');
        scriptTitle.className = 'script-title';
        scriptTitle.innerHTML = `<i class="fas fa-file-code"></i> ${script.id} <span class="badge badge-primary">${script.dbType} - ${script.scriptType}</span>`;
        
        const scriptActions = document.createElement('div');
        scriptActions.className = 'script-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-success';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadBtn.addEventListener('click', () => {
            downloadScript(script);
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger';
        removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
        removeBtn.addEventListener('click', () => {
            generatedScripts.splice(index, 1);
            renderScriptsList();
        });
        
        scriptActions.appendChild(downloadBtn);
        scriptActions.appendChild(removeBtn);
        
        scriptHeader.appendChild(scriptTitle);
        scriptHeader.appendChild(scriptActions);
        
        const scriptContent = document.createElement('pre');
        scriptContent.className = 'script-preview';
        scriptContent.textContent = script.content.substring(0, 200) + '...';
        
        scriptItem.appendChild(scriptHeader);
        scriptItem.appendChild(scriptContent);
        
        scriptsList.appendChild(scriptItem);
    });
}

// Download a single script
function downloadScript(script) {
    const blob = new Blob([script.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.id}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download all scripts as individual files
function downloadAllScripts() {
    if (generatedScripts.length === 0) {
        alert('No scripts to download.');
        return;
    }
    
    // Use a setTimeout to download files sequentially to avoid browser blocking
    generatedScripts.forEach((script, index) => {
        setTimeout(() => {
            downloadScript(script);
        }, index * 200);
    });
}

// Add template status indicator
function renderTemplateStatus() {
    const statusContainer = document.getElementById('template-status-container');
    statusContainer.innerHTML = '';
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'template-status';
    
    const statusTitle = document.createElement('div');
    statusTitle.className = 'template-status-title';
    statusTitle.innerHTML = '<i class="fas fa-info-circle"></i> Template Status';
    
    statusDiv.appendChild(statusTitle);
    
    const templateKeys = Object.keys(wrapperTemplates).filter(key => key !== 'default');
    
    templateKeys.forEach(key => {
        const statusItem = document.createElement('div');
        statusItem.className = 'template-status-item';
        
        if (wrapperTemplates[key]) {
            statusItem.innerHTML = `<span class="status-icon status-ok"><i class="fas fa-check"></i></span> ${key}`;
        } else {
            statusItem.innerHTML = `<span class="status-icon status-warning"><i class="fas fa-exclamation-triangle"></i></span> ${key} (using default)`;
        }
        
        statusDiv.appendChild(statusItem);
    });
    
    statusContainer.appendChild(statusDiv);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Update footer year
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Get DOM references
    scriptsContainer = document.getElementById('scripts-container');
    addScriptBtn = document.getElementById('add-script-btn');
    generateAllBtn = document.getElementById('generate-all-btn');
    scriptsList = document.getElementById('scripts-list');
    downloadAllBtn = document.getElementById('download-all-btn');
    downloadAllContainer = document.getElementById('download-all-container');
    startScriptNumberInput = document.getElementById('start-script-number');
    
    // Add event listeners
    if (addScriptBtn) {
        addScriptBtn.addEventListener('click', addScriptBox);
    } else {
        console.error("Add Script button not found in the DOM");
    }
    
    if (generateAllBtn) {
        generateAllBtn.addEventListener('click', generateAllScripts);
    }
    
    if (startScriptNumberInput) {
        startScriptNumberInput.addEventListener('input', updateAllScriptNumbers);
    }
    
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllScripts);
    }
    
    // Load all wrapper templates
    await loadAllTemplates();
    
    // Add first script box
    if (scriptsContainer) {
        addScriptBox();
    } else {
        console.error("Scripts container not found in the DOM");
    }
    
    // Render template status
    renderTemplateStatus();
});