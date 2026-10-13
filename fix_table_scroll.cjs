const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const oldTable = `<div class="table-container fade-in" style="margin-top:20px;">
            <table id="price-list-table" class="control-tower-table" style="width: 100%; border-collapse: collapse; min-width: 1000px;">
              <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">`;
              
const newTable = `<div class="table-container fade-in" style="margin-top:20px; max-height: 580px; overflow-y: auto;">
            <table id="price-list-table" class="control-tower-table" style="width: 100%; border-collapse: collapse; min-width: 1000px;">
              <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); position: sticky; top: 0; z-index: 10;">`;

if (html.includes(oldTable)) {
    html = html.replace(oldTable, newTable);
    fs.writeFileSync('dashboard.html', html);
    console.log('Added vertical scroll and sticky header');
} else {
    console.log('Could not find table structure in dashboard.html');
}
