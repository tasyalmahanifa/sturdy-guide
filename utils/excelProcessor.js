import XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

export class ExcelProcessor {
  constructor(rulesPath = './config/rules.json') {
    this.rulesPath = rulesPath;
    this.rules = null;
  }

  async loadRules() {
    try {
      const rulesData = await fs.readFile(this.rulesPath, 'utf8');
      this.rules = JSON.parse(rulesData);
      return this.rules;
    } catch (error) {
      throw new Error(`Failed to load rules: ${error.message}`);
    }
  }

  async saveRules(rules) {
    try {
      await fs.writeFile(this.rulesPath, JSON.stringify(rules, null, 2));
      this.rules = rules;
      return true;
    } catch (error) {
      throw new Error(`Failed to save rules: ${error.message}`);
    }
  }

  // Create reverse mapping from route to team for faster lookup
  createRouteToTeamMap(rules) {
    const routeToTeam = {};
    for (const [team, routes] of Object.entries(rules)) {
      for (const route of routes) {
        routeToTeam[route.toLowerCase().trim()] = team;
      }
    }
    return routeToTeam;
  }

  async processExcelFile(filePath) {
    if (!this.rules) {
      await this.loadRules();
    }

    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Check if DATATUNGGAKAN sheet exists
      if (!workbook.SheetNames.includes('DATATUNGGAKAN')) {
        throw new Error('Sheet "DATATUNGGAKAN" not found in the uploaded file');
      }

      const worksheet = workbook.Sheets['DATATUNGGAKAN'];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        throw new Error('The DATATUNGGAKAN sheet is empty');
      }

      // Extract header row (first row)
      const headerRow = jsonData[0];
      
      // Validate that column E (index 4) exists
      if (headerRow.length <= 4) {
        throw new Error('Column E (ROUTE/RUTE) not found in the sheet');
      }

      // Extract data rows (skip header)
      const dataRows = jsonData.slice(1);

      // Create route to team mapping
      const routeToTeam = this.createRouteToTeamMap(this.rules);

      // Group rows by team
      const teamSheets = {};
      const unmappedRows = [];

      for (const row of dataRows) {
        if (row.length === 0) continue; // Skip empty rows

        const routeValue = row[4]; // Column E (index 4)
        if (!routeValue) {
          unmappedRows.push(row);
          continue;
        }

        const routeKey = String(routeValue).toLowerCase().trim();
        const team = routeToTeam[routeKey];

        if (team) {
          if (!teamSheets[team]) {
            teamSheets[team] = [];
          }
          teamSheets[team].push(row);
        } else {
          unmappedRows.push(row);
        }
      }

      // Create new workbook
      const newWorkbook = XLSX.utils.book_new();

      // Add team sheets
      for (const [team, rows] of Object.entries(teamSheets)) {
        // Truncate sheet name to 31 characters for Excel safety
        const sheetName = team.substring(0, 31);
        
        // Add header row to each sheet
        const sheetData = [headerRow, ...rows];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
      }

      // Add UNMAPPED sheet if there are unmapped rows
      if (unmappedRows.length > 0) {
        const unmappedData = [headerRow, ...unmappedRows];
        const unmappedWorksheet = XLSX.utils.aoa_to_sheet(unmappedData);
        XLSX.utils.book_append_sheet(newWorkbook, unmappedWorksheet, 'UNMAPPED');
      }

      // Generate output filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFileName = `hasil_${timestamp}.xlsx`;
      const outputPath = path.join('uploads', outputFileName);

      // Write the new workbook
      XLSX.writeFile(newWorkbook, outputPath);

      // Clean up input file
      await fs.unlink(filePath);

      return {
        success: true,
        outputFile: outputFileName,
        outputPath: outputPath,
        teamsProcessed: Object.keys(teamSheets),
        unmappedRowsCount: unmappedRows.length,
        summary: {
          totalTeams: Object.keys(teamSheets).length,
          hasUnmapped: unmappedRows.length > 0,
          teamCounts: Object.fromEntries(
            Object.entries(teamSheets).map(([team, rows]) => [team, rows.length])
          )
        }
      };

    } catch (error) {
      // Clean up input file on error
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError);
      }
      throw error;
    }
  }

  async getRules() {
    if (!this.rules) {
      await this.loadRules();
    }
    return this.rules;
  }
}

export default ExcelProcessor;