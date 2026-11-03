# Graph Report - atlantis-dashboard  (2026-11-02)

## Corpus Check
- 51 files · ~18,941 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 12, (none) 2, .ico 1)

## Summary
- 236 nodes · 711 edges · 8 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e624f8bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Icon
- package.json
- PropertiesPage.js
- advisor.js
- App.js
- PropertyForm.js
- ProfilePage.js
- lib.js

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 36 edges
2. `react` - 21 edges
3. `ClientsPage()` - 20 edges
4. `PropertyForm()` - 19 edges
5. `usePropertyActions()` - 19 edges
6. `App()` - 18 edges
7. `CommissionsPage()` - 14 edges
8. `DashboardPage()` - 14 edges
9. `PropertiesPage()` - 14 edges
10. `react-router-dom` - 13 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `Layout()`  [EXTRACTED]
  src/App.js → src/components/Layout.js
- `App()` --calls--> `ClientsPage()`  [EXTRACTED]
  src/App.js → src/pages/ClientsPage.js
- `App()` --calls--> `CommissionsPage()`  [EXTRACTED]
  src/App.js → src/pages/CommissionsPage.js
- `App()` --calls--> `DashboardPage()`  [EXTRACTED]
  src/App.js → src/pages/DashboardPage.js
- `App()` --calls--> `ProfilePage()`  [EXTRACTED]
  src/App.js → src/pages/ProfilePage.js

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "Icon"
Cohesion: 0.13
Nodes (27): react, ActionMenu(), ClientForm(), handleSubmit(), validate(), ConfirmDialog(), Icon(), PATHS (+19 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (37): browserslist, development, production, dependencies, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, react-scripts@5.0.1 (+29 more)

### Community 2 - "PropertiesPage.js"
Cohesion: 0.16
Nodes (25): AsyncView(), Chart(), niceStep(), PAD, SelectField(), useAsync(), formatArea(), formatDate() (+17 more)

### Community 3 - "advisor.js"
Cohesion: 0.14
Nodes (23): usePropertyActions(), done(), handleCreate(), handleDeactivate(), handleEdit(), reactivate(), withOwner(), HOUSE (+15 more)

### Community 4 - "App.js"
Cohesion: 0.20
Nodes (19): react-router-dom, App(), handleLogout(), handleUserChange(), root, LoginPage(), handleSubmit(), clearCachedUser() (+11 more)

### Community 5 - "PropertyForm.js"
Cohesion: 0.15
Nodes (22): decimal(), digits(), EMPTY, isLocalPreview(), money(), OPERATION_KEYS, OPERATIONS, PHOTO_TYPES (+14 more)

### Community 6 - "ProfilePage.js"
Cohesion: 0.19
Nodes (16): DATA_FIELDS, Fields(), PASSWORD_FIELDS, ProfileForms(), ProfilePage(), PROFILE, USER, useSubmit() (+8 more)

### Community 7 - "lib.js"
Cohesion: 0.20
Nodes (16): DEFAULTS, LocationField(), choose(), onKeyDown(), settle(), Harness(), COMMERCIAL_STATES, findLocation() (+8 more)

## Knowledge Gaps
- **2 isolated node(s):** `react-app`, `react-app/jest`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 47 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Icon` to `package.json`, `PropertiesPage.js`, `App.js`, `PropertyForm.js`, `ProfilePage.js`, `lib.js`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **What connects `react-app`, `react-app/jest` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Icon` be split into smaller, more focused modules?**
  _Cohesion score 0.12775842044134728 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Icon` to `PropertiesPage.js`, `PropertyForm.js`, `ProfilePage.js`, `lib.js`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06025641025641026 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `App.js` to `Icon`, `package.json`, `PropertiesPage.js`, `advisor.js`, `ProfilePage.js`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `advisor.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._