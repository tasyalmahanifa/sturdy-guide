class ExcelProcessorApp {
  constructor() {
    this.currentFile = null;
    this.processedResult = null;
    this.rules = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadRules();
  }

  initializeElements() {
    // Upload elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.selectButton = document.getElementById('selectButton');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.uploadButton = document.getElementById('uploadButton');
    
    // Status elements
    this.statusSection = document.getElementById('statusSection');
    this.statusText = document.getElementById('statusText');
    this.spinner = document.getElementById('spinner');
    this.progressFill = document.getElementById('progressFill');
    
    // Results elements
    this.resultsSection = document.getElementById('resultsSection');
    this.resultsSummary = document.getElementById('resultsSummary');
    this.downloadButton = document.getElementById('downloadButton');
    this.resetButton = document.getElementById('resetButton');
    
    // Rules elements
    this.rulesPreview = document.getElementById('rulesPreview');
    this.editRulesButton = document.getElementById('editRulesButton');
    this.rulesEditor = document.getElementById('rulesEditor');
    this.rulesTextarea = document.getElementById('rulesTextarea');
    this.saveRulesButton = document.getElementById('saveRulesButton');
    this.cancelRulesButton = document.getElementById('cancelRulesButton');
    
    // Toast elements
    this.errorToast = document.getElementById('errorToast');
    this.successToast = document.getElementById('successToast');
    this.errorMessage = document.getElementById('errorMessage');
    this.successMessage = document.getElementById('successMessage');
    this.closeErrorToast = document.getElementById('closeErrorToast');
    this.closeSuccessToast = document.getElementById('closeSuccessToast');
  }

  setupEventListeners() {
    // File upload events
    this.selectButton.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.uploadButton.addEventListener('click', () => this.processFile());
    
    // Drag and drop events
    this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
    
    // Results events
    this.downloadButton.addEventListener('click', () => this.downloadResult());
    this.resetButton.addEventListener('click', () => this.resetApplication());
    
    // Rules events
    this.editRulesButton.addEventListener('click', () => this.editRules());
    this.saveRulesButton.addEventListener('click', () => this.saveRules());
    this.cancelRulesButton.addEventListener('click', () => this.cancelEditRules());
    
    // Toast events
    this.closeErrorToast.addEventListener('click', () => this.hideErrorToast());
    this.closeSuccessToast.addEventListener('click', () => this.hideSuccessToast());
  }

  // File handling methods
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.setSelectedFile(file);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    this.uploadArea.classList.add('dragover');
  }

  handleDragLeave(event) {
    event.preventDefault();
    this.uploadArea.classList.remove('dragover');
  }

  handleDrop(event) {
    event.preventDefault();
    this.uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (this.validateFile(file)) {
        this.fileInput.files = files;
        this.setSelectedFile(file);
      }
    }
  }

  validateFile(file) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.showError('Please select a valid Excel file (.xlsx)');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      this.showError('File size must be less than 10MB');
      return false;
    }
    
    return true;
  }

  setSelectedFile(file) {
    if (!this.validateFile(file)) return;
    
    this.currentFile = file;
    this.fileName.textContent = file.name;
    this.fileSize.textContent = this.formatFileSize(file.size);
    this.fileInfo.style.display = 'flex';
    this.uploadArea.style.display = 'none';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File processing methods
  async processFile() {
    if (!this.currentFile) {
      this.showError('Please select a file first');
      return;
    }

    this.showProcessingStatus();

    try {
      const formData = new FormData();
      formData.append('excelFile', this.currentFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.processedResult = result.data;
        this.showResults();
        this.showSuccess('File processed successfully!');
      } else {
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      this.showError(error.message || 'Failed to process file');
      this.hideProcessingStatus();
    }
  }

  showProcessingStatus() {
    this.statusSection.style.display = 'block';
    this.resultsSection.style.display = 'none';
    this.statusText.textContent = 'Processing file...';
    this.spinner.style.display = 'block';
  }

  hideProcessingStatus() {
    this.statusSection.style.display = 'none';
  }

  showResults() {
    this.hideProcessingStatus();
    this.resultsSection.style.display = 'block';
    
    const result = this.processedResult;
    const summary = result.summary;
    
    this.resultsSummary.innerHTML = `
      <h4>Processing Summary</h4>
      <ul>
        <li><strong>Total Teams:</strong> <span class="team-count">${summary.totalTeams}</span></li>
        <li><strong>Unmapped Rows:</strong> <span class="team-count">${result.unmappedRowsCount}</span></li>
        <li><strong>Teams Processed:</strong> ${result.teamsProcessed.join(', ')}</li>
      </ul>
      ${summary.teamCounts ? this.renderTeamCounts(summary.teamCounts) : ''}
    `;
  }

  renderTeamCounts(teamCounts) {
    const counts = Object.entries(teamCounts)
      .map(([team, count]) => `<li><strong>${team}:</strong> ${count} rows</li>`)
      .join('');
    
    return `
      <h4 style="margin-top: 16px;">Rows per Team</h4>
      <ul>${counts}</ul>
    `;
  }

  async downloadResult() {
    if (!this.processedResult) {
      this.showError('No processed file available for download');
      return;
    }

    try {
      const response = await fetch(`/api/download/${this.processedResult.outputFile}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.processedResult.outputFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showSuccess('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to download file');
    }
  }

  resetApplication() {
    this.currentFile = null;
    this.processedResult = null;
    
    this.fileInput.value = '';
    this.fileInfo.style.display = 'none';
    this.uploadArea.style.display = 'block';
    this.statusSection.style.display = 'none';
    this.resultsSection.style.display = 'none';
  }

  // Rules management methods
  async loadRules() {
    try {
      const response = await fetch('/api/rules');
      const result = await response.json();
      
      if (result.success) {
        this.rules = result.data;
        this.updateRulesPreview();
      } else {
        throw new Error(result.message || 'Failed to load rules');
      }
    } catch (error) {
      console.error('Load rules error:', error);
      this.showError('Failed to load rules configuration');
    }
  }

  updateRulesPreview() {
    if (this.rules) {
      this.rulesPreview.textContent = JSON.stringify(this.rules, null, 2);
    }
  }

  editRules() {
    this.rulesTextarea.value = JSON.stringify(this.rules, null, 2);
    this.rulesEditor.style.display = 'block';
    this.editRulesButton.style.display = 'none';
  }

  async saveRules() {
    try {
      const rulesText = this.rulesTextarea.value;
      const newRules = JSON.parse(rulesText);
      
      const response = await fetch('/api/rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRules)
      });

      const result = await response.json();
      
      if (result.success) {
        this.rules = newRules;
        this.updateRulesPreview();
        this.cancelEditRules();
        this.showSuccess('Rules updated successfully!');
      } else {
        throw new Error(result.message || 'Failed to save rules');
      }
    } catch (error) {
      console.error('Save rules error:', error);
      if (error instanceof SyntaxError) {
        this.showError('Invalid JSON format in rules');
      } else {
        this.showError(error.message || 'Failed to save rules');
      }
    }
  }

  cancelEditRules() {
    this.rulesEditor.style.display = 'none';
    this.editRulesButton.style.display = 'inline-flex';
  }

  // Toast methods
  showError(message) {
    this.errorMessage.textContent = message;
    this.errorToast.style.display = 'flex';
    this.hideSuccessToast();
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideErrorToast(), 5000);
  }

  showSuccess(message) {
    this.successMessage.textContent = message;
    this.successToast.style.display = 'flex';
    this.hideErrorToast();
    
    // Auto-hide after 3 seconds
    setTimeout(() => this.hideSuccessToast(), 3000);
  }

  hideErrorToast() {
    this.errorToast.style.display = 'none';
  }

  hideSuccessToast() {
    this.successToast.style.display = 'none';
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ExcelProcessorApp();
});