import type {CSSProperties} from 'react';
import type {Report} from '../lib/wwbp/types';
import {mapPlayers,unknownColor} from '../lib/map-legend';
export default function MapLegend({report}:{report:Report}){
 return <details className="map-key" open><summary>Map key · Turn {report.turn}</summary><p>Players shown by the ownership and control markers in this report.</p><ul role="list" className="map-key-players">{mapPlayers(report).map(player=><li key={player.id}><span aria-hidden="true" className="key-dot" style={{'--player-color':player.color} as CSSProperties}/><span>Player {player.id}{player.you?' (you)':''}{player.name?' · '+player.name:''}</span></li>)}</ul><div className="map-key-symbols"><p><span className="key-dot" aria-hidden="true"/> Occupied</p><p><span className="key-dot hollow" aria-hidden="true"/> Controlled minor</p><p><span className="key-dot" aria-hidden="true" style={{'--player-color':unknownColor} as CSSProperties}/> No player ownership/control shown</p></div><p>Sea markers do not identify fleet owners. Select a space for reported fleets and forces. Player colors may repeat; select a marker to confirm its player.</p></details>;
}
