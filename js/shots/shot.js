import { createDot } from "./dot.js";
import { createNewRow } from "../shot-table/row.js";
import {
    getHeaderRow,
    setRows,
    getRows,
    setFilteredRows,
    getFilteredRows,
    setNumRows,
    getNumRows
} from "../shot-table/shot-table-functions.js";
import { updateTableFooter } from "../shot-table/shot-table.js";
import { getTypeIndex } from "../details/details-functions.js";
import { heatMap } from "../toggles.js";
import { filterRows } from "../shot-table/filter.js";
import {
    sport,
    cfgSportA,
    cfgSportGoalCoords,
    perimeterId
} from "../../setup.js";

function setUpShots() {
    // http://thenewcode.com/1068/Making-Arrows-in-SVG
    for (let className of ["blueTeam", "orangeTeam", "greyTeam"]) {
        d3.select(`#${sport}-svg`)
            .insert("marker", "g")
            .attr("id", `arrowhead-${className}`)
            .attr("markerWidth", 10)
            .attr("markerHeight", 5)
            .attr("refX", 2.5)
            .attr("refY", 2.5)
            .attr("orient", "auto")
            .append("polygon")
            .attr("points", "0 0, 5 2.5, 0 5")
            .attr("class", className);
    }

    d3.select("#playing-area").select(perimeterId).on("click", onClickShot);
}

export function onClickShot(e) {
    document.getSelection().removeAllRanges();
    d3.select("#ghost").selectAll("*").remove();
    let shiftHeld = sessionStorage.getItem("shiftHeld");
    let firstPoint =
        sessionStorage.getItem("firstPoint") === "null"
            ? null
            : sessionStorage.getItem("firstPoint").split(",").map(parseFloat);
    if (shiftHeld === "true" && firstPoint === null) {
        // create ghost dot for first point
        sessionStorage.setItem("firstPoint", d3.pointer(e));
        const type = d3.select("#shot-type").empty()
            ? null
            : d3.select("#shot-type").select("select").property("value");
        createDot("#ghost", "ghost-dot", {
            id: "ghost-dot",
            typeIndex: getTypeIndex(type),
            teamColor: d3.select("input[name='team-bool']:checked").empty()
                ? null
                : d3
                      .select("input[name='team-bool']:checked")
                      .property("value"),
            coords: d3.pointer(e),
            ghostBool: true
        });
    } else if (shiftHeld === "true" && firstPoint !== null) {
        sessionStorage.setItem("firstPoint", null);
        createShotFromEvent(e, firstPoint);
    } else {
        createShotFromEvent(e);
    }
}

function createShotFromEvent(e, point1) {
    // https://stackoverflow.com/a/29325047

    const columns = getHeaderRow();
    const id = uuidv4();
    let rowData = {};
    let specialData = {
        // data for custom specifics like color etc.
        typeIndex: 0,
        coords: point1 ? point1 : d3.pointer(e),
        coords2: point1 ? d3.pointer(e) : null,
        numberCol: _.findIndex(columns, { type: "shot-number" }) - 1 // subtract out checkbox column
    };

    for (let col of columns) {
        switch (col.type) {
            case "radio":
                rowData[col.id] = d3
                    .select(`input[name="${col.id}"]:checked`)
                    .property("value");
                break;
            case "player":
                specialData["player"] = d3
                    .select("#" + col.id)
                    .select("input")
                    .property("value");
            case "text-field":
                rowData[col.id] = d3
                    .select("#" + col.id)
                    .select("input")
                    .property("value");
                break;
            case "shot-type":
                const type = d3
                    .select("#" + col.id)
                    .select("select")
                    .property("value");
                specialData["typeIndex"] = getTypeIndex(type);
            case "dropdown":
                rowData[col.id] = d3
                    .select("#" + col.id)
                    .select("select")
                    .property("value");
                break;
            case "time":
                rowData[col.id] = d3
                    .select("#" + col.id)
                    .select("input")
                    .property("value");
                break;
            case "team":
                specialData["teamColor"] = d3
                    .select("input[name='team-bool']:checked")
                    .property("value");
                rowData[col.id] = d3
                    .select(
                        specialData["teamColor"] === "blueTeam"
                            ? "#blue-team-name"
                            : "#orange-team-name"
                    )
                    .property("value");
                break;
            case "shot-number":
                rowData[col.id] = getNumRows() + 1;
                break;
            case "x":
                if (col.id === "x2") {
                    let x2 = specialData["coords2"]
                        ? (
                              specialData["coords2"][0] -
                              cfgSportA.width / 2
                          ).toFixed(2)
                        : "";
                    rowData[col.id] = x2;
                } else {
                    rowData[col.id] = (
                        specialData["coords"][0] -
                        cfgSportA.width / 2
                    ).toFixed(2);
                }
                break;
            case "y":
                if (col.id === "y2") {
                    let y2 = specialData["coords2"]
                        ? (
                              -1 *
                              (specialData["coords2"][1] - cfgSportA.height / 2)
                          ).toFixed(2)
                        : "";
                    rowData[col.id] = y2;
                } else {
                    rowData[col.id] = (
                        -1 *
                        (specialData["coords"][1] - cfgSportA.height / 2)
                    ).toFixed(2);
                }
                break;
            case "distance-calc":
                // if 2 coordinate event, record distance between points
                function distance([x1, y1], [x2, y2]) {
                    return Math.sqrt(
                        Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)
                    );
                }

                if (specialData["coords2"]) {
                    rowData[col.id] = distance(
                        specialData["coords"],
                        specialData["coords2"]
                    ).toFixed(2);
                } else {
                    // else if 1 coordinate event, record distance to nearest goal
                    if (cfgSportGoalCoords) {
                        rowData[col.id] = Math.min(
                            ..._.map(cfgSportGoalCoords, (g) =>
                                distance(g, specialData["coords"])
                            )
                        ).toFixed(2);
                    } else {
                        rowData[col.id] = "";
                    }
                }
                break;
            case "value-calc":
                rowData[col.id] =
                    e.target.id === "left-arc" || e.target.id === "right-arc"
                        ? 2
                        : 3;
                break;
            case "in-out":
                rowData[col.id] =
                    e.target.id === "outside-perimeter" ? "In" : "Out";
                break;
            default:
                continue;
        }
    }

    // add row to sessionStorage
    createShotFromData(id, rowData, specialData);
}

function createShotFromData(id, rowData, specialData) {
    const newRow = {
        id: id,
        rowData: rowData,
        specialData: specialData,
        selected: false
    };

    const newRows = [...getRows(), newRow];
    setRows(newRows);
    updateTableFooter();
    if (filterRows([newRow]).length == 1) {
        createDot("#normal", id, specialData, "visible");
        setFilteredRows([...getFilteredRows(), newRow]);
        createNewRow(id, rowData, specialData);
        heatMap();
    } else {
        createDot("#normal", id, specialData, "hidden");
        setNumRows(newRows.length);
        updateTableFooter();
    }
}

export { setUpShots, createShotFromData };
