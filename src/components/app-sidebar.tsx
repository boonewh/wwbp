"use client";
import type {ReactNode} from 'react';
import Icon,{type IconName} from './icons';

export const VIEWS=['map','orders','forces','summary','allies','intel','battles','coordinated'] as const;
export type View=typeof VIEWS[number];
export const isView=(value:string|null):value is View=>!!value&&(VIEWS as readonly string[]).includes(value);
export const ownViews:readonly View[]=['map','orders','forces','summary'];

type Item={id:View;label:string;icon:IconName;badge?:ReactNode};
export const viewLabels:Record<View,string>={map:'Map & intelligence',orders:'Orders',forces:'Forces ledger',summary:'Turn summary',allies:'Allied reports',intel:'Combined intel',battles:'Battle planner',coordinated:'Coordinated orders'};

export function Byline({compact=false}:{compact?:boolean}){
 return <a className="byline" href="https://pathsixsolutions.com" target="_blank" rel="noopener noreferrer" aria-label="Built by PathSix Solutions (opens in a new tab)">{compact?<span className="byline-mark">P<span className="six">6</span></span>:<>by <span className="byline-name">Path<span className="six">Six</span> Solutions</span></>}</a>;
}

export default function AppSidebar({view,onView,collapsed,onCollapse,open,campaignArea,importButton,footer,ordersBadge,ordersAttention,alliedCount,disabled}:{view:View;onView:(v:View)=>void;collapsed:boolean;onCollapse:()=>void;open:boolean;campaignArea:ReactNode;importButton:ReactNode;footer:ReactNode;ordersBadge?:string;ordersAttention?:boolean;alliedCount:number;disabled:boolean}){
 const mine:Item[]=[{id:'map',label:viewLabels.map,icon:'map'},{id:'orders',label:viewLabels.orders,icon:'orders',badge:<>{ordersBadge&&<span className="nav-badge">{ordersBadge}</span>}{ordersAttention&&<span className="nav-dot" title="Unsaved changes"/>}</>},{id:'forces',label:viewLabels.forces,icon:'ledger'},{id:'summary',label:viewLabels.summary,icon:'summary'}];
 const alliance:Item[]=[{id:'allies',label:viewLabels.allies,icon:'allies',badge:alliedCount?<span className="nav-badge">{alliedCount}</span>:null},{id:'intel',label:viewLabels.intel,icon:'intel'},{id:'battles',label:viewLabels.battles,icon:'battles'},{id:'coordinated',label:viewLabels.coordinated,icon:'coordinated'}];
 const render=(items:Item[])=>items.map(item=><button type="button" key={item.id} disabled={disabled} aria-current={view===item.id?'page':undefined} aria-label={item.label} title={collapsed?item.label:undefined} onClick={()=>onView(item.id)}><Icon name={item.icon}/><span className="nav-label">{item.label}</span>{item.badge}</button>);
 return <aside id="sidebar" className="sidebar" data-open={open} aria-label="Campaign navigation">
  <div className="sidebar-brand"><a href="/" className="sidebar-logo" aria-label="WWBP campaign room home">WW<span>BP</span></a><span className="sidebar-subtitle">Campaign room</span><button type="button" className="sidebar-collapse" onClick={onCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} title={collapsed?'Expand sidebar':'Collapse sidebar'}><Icon name={collapsed?'expand':'collapse'}/></button></div>
  <div className="sidebar-campaign">{campaignArea}</div>
  {importButton}
  <nav className="side-nav" aria-label="Campaign views">
   <p className="nav-group">My turn</p>{render(mine)}
   <p className="nav-group">Alliance <span className="beta">beta</span></p>{render(alliance)}
  </nav>
  <div className="sidebar-footer">{footer}<Byline compact={collapsed}/></div>
 </aside>;
}
