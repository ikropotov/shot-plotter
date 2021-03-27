import { setUpRink } from "./js/rink.js";
import { setUpOptions } from "./js/options.js";
import { setUpShots } from "./js/shots.js";
import { setUpTable } from "./js/table.js";
import { downloadCSV } from "./js/upload-download.js";
function index() {
    d3.xml("resources/hockey-rink.svg").then(data => {
        setUpRink(data);
        setUpOptions();
        setUpTable();
        setUpShots();

        d3.select("#download").on("click", downloadCSV);
    });
}

export { index };