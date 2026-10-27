/* TP « Nombre mystère » : éditeur de blocs + vues Python / organigramme / pseudo-code, puis éditeur Python.
   Utilise Blockly (assets/blockly) et le moteur Python commun (py-runtime.js). */
(function(){
  "use strict";

  var KEY_BLOCKS = "nombre-mystere-blocs";
  var KEY_PYTHON = "nombre-mystere-python";
  var KEY_TAB = "nombre-mystere-onglet";
  var PY_START = "import random\n\nnombre_secret = random.randint(1, 100)\n\n# Continuez le programme ici\n";

  function store(key, value){ try{ localStorage.setItem(key, value); }catch(e){} }
  function restore(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function $(id){ return document.getElementById(id); }

  /* =====================================================
     1. Blocs : textes en français (vocabulaire du TP)
     ===================================================== */
  var M = Blockly.Msg;
  M.VARIABLES_SET = "mettre %1 à %2";
  M.MATH_CHANGE_TITLE = "ajouter %2 à %1";
  M.MATH_RANDOM_INT_TITLE = "nombre aléatoire entre %1 et %2";
  M.TEXT_PRINT_TITLE = "afficher %1";
  M.CONTROLS_WHILEUNTIL_OPERATOR_WHILE = "répéter tant que";
  M.CONTROLS_WHILEUNTIL_OPERATOR_UNTIL = "répéter jusqu'à ce que";
  M.CONTROLS_IF_MSG_THEN = "alors";
  M.CONTROLS_REPEAT_INPUT_DO = "faire";
  M.CONTROLS_WHILEUNTIL_INPUT_DO = "faire";
  M.LOGIC_BOOLEAN_TRUE = "vrai";
  M.LOGIC_BOOLEAN_FALSE = "faux";
  M.NEW_VARIABLE = "Créer une variable…";
  M.NEW_VARIABLE_TITLE = "Nom de la nouvelle variable (sans espace ni accent) :";

  Blockly.common.defineBlocksWithJsonArray([
    { type:"mm_input_int", message0:"demander %1 et attendre un nombre",
      args0:[{ type:"input_value", name:"TEXT", check:"String" }],
      output:"Number", colour:160, inputsInline:true,
      tooltip:"Pose une question au joueur et renvoie sa réponse sous forme de nombre entier (en Python : int(input(...)))." },
    { type:"mm_input_text", message0:"demander %1 et attendre un texte",
      args0:[{ type:"input_value", name:"TEXT", check:"String" }],
      output:"String", colour:160, inputsInline:true,
      tooltip:"Pose une question et renvoie la réponse telle quelle, sous forme de texte (en Python : input(...))." },
    { type:"mm_print2", message0:"afficher %1 %2",
      args0:[{ type:"input_value", name:"A" }, { type:"input_value", name:"B" }],
      previousStatement:null, nextStatement:null, colour:160, inputsInline:true,
      tooltip:"Affiche deux valeurs sur la même ligne, séparées par un espace (en Python : print(a, b))." },
    { type:"mm_print3", message0:"afficher %1 %2 %3",
      args0:[{ type:"input_value", name:"A" }, { type:"input_value", name:"B" }, { type:"input_value", name:"C" }],
      previousStatement:null, nextStatement:null, colour:160, inputsInline:true,
      tooltip:"Affiche trois valeurs sur la même ligne (en Python : print(a, b, c))." }
  ]);

  // Noms de variables : sans accent ni espace, pour qu'ils soient valides en Python
  function pyName(s){
    var n = String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/[^A-Za-z0-9_]+/g, "_");
    if(!n) n = "variable";
    if(/^[0-9]/.test(n)) n = "_" + n;
    return n;
  }
  Blockly.dialog.setPrompt(function(message, defaultValue, callback){
    var v = window.prompt(message, defaultValue);
    callback(v === null ? null : pyName(v));
  });

  function text(t){ return { block:{ type:"text", fields:{ TEXT:t } } }; }
  function shadowText(t){ return { shadow:{ type:"text", fields:{ TEXT:t } } }; }
  function shadowNum(n){ return { shadow:{ type:"math_number", fields:{ NUM:n } } }; }

  var TOOLBOX = {
    kind:"categoryToolbox",
    contents:[
      { kind:"category", name:"Variables", categorystyle:"variable_category", custom:"VARIABLE" },
      { kind:"category", name:"Entrées / sorties", colour:"160", contents:[
        { kind:"block", type:"mm_input_int", inputs:{ TEXT:shadowText("Votre proposition ? ") } },
        { kind:"block", type:"mm_input_text", inputs:{ TEXT:shadowText("Votre réponse ? ") } },
        { kind:"block", type:"text_print", inputs:{ TEXT:shadowText("Bonjour") } },
        { kind:"block", type:"mm_print2", inputs:{ A:shadowText("Gagné en"), B:shadowNum(0) } },
        { kind:"block", type:"mm_print3", inputs:{ A:shadowText("Gagné en"), B:shadowNum(0), C:shadowText("essais") } },
        { kind:"block", type:"text" }
      ]},
      { kind:"category", name:"Conditions", categorystyle:"logic_category", contents:[
        { kind:"block", type:"controls_if" },
        { kind:"block", type:"controls_if", extraState:{ hasElse:true } },
        { kind:"block", type:"controls_if", extraState:{ elseIfCount:1, hasElse:true } },
        { kind:"block", type:"logic_compare" },
        { kind:"block", type:"logic_operation" },
        { kind:"block", type:"logic_negate" },
        { kind:"block", type:"logic_boolean" }
      ]},
      { kind:"category", name:"Boucles", categorystyle:"loop_category", contents:[
        { kind:"block", type:"controls_whileUntil" },
        { kind:"block", type:"controls_flow_statements", fields:{ FLOW:"BREAK" } }
      ]},
      { kind:"category", name:"Calculs", categorystyle:"math_category", contents:[
        { kind:"block", type:"math_number" },
        { kind:"block", type:"math_random_int", inputs:{ FROM:shadowNum(1), TO:shadowNum(100) } },
        { kind:"block", type:"math_arithmetic", inputs:{ A:shadowNum(1), B:shadowNum(1) } },
        { kind:"block", type:"math_modulo", inputs:{ DIVIDEND:shadowNum(10), DIVISOR:shadowNum(2) } }
      ]}
    ]
  };

  /* =====================================================
     2. Traduction des blocs : Python, pseudo-code, organigramme
     ===================================================== */
  var CMP_PY = { EQ:"==", NEQ:"!=", LT:"<", LTE:"<=", GT:">", GTE:">=" };
  var CMP_PS = { EQ:"=", NEQ:"≠", LT:"<", LTE:"≤", GT:">", GTE:"≥" };
  var ARITH_PY = { ADD:["+",5], MINUS:["-",5], MULTIPLY:["*",6], DIVIDE:["/",6], POWER:["**",7] };
  var ARITH_PS = { ADD:"+", MINUS:"-", MULTIPLY:"×", DIVIDE:"/", POWER:"^" };

  function varName(b){ return pyName(b.getField("VAR").getText()); }
  function pyString(s){ return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }

  // Traduit une expression ; renvoie [texte, priorité] pour placer les parenthèses
  function expr(b, lang, ctx, label){
    var ps = lang === "ps";
    if(!b){ ctx.missing.push(label || "une valeur"); return [ps ? "…" : "___", 9]; }
    function sub(name, lbl, minPrec){
      var r = expr(b.getInputTargetBlock(name), lang, ctx, lbl);
      return r[1] < minPrec ? "(" + r[0] + ")" : r[0];
    }
    switch(b.type){
      case "math_number": return [String(b.getFieldValue("NUM")), 9];
      case "text": return [pyString(b.getFieldValue("TEXT")), 9];
      case "variables_get": return [varName(b), 9];
      case "logic_boolean":
        return [b.getFieldValue("BOOL") === "TRUE" ? (ps ? "VRAI" : "True") : (ps ? "FAUX" : "False"), 9];
      case "math_random_int":
        ctx.random = true;
        return [(ps ? "ALEATOIRE(" : "random.randint(") + sub("FROM", "le minimum du nombre aléatoire", 0) + (ps ? "," : ", ") + sub("TO", "le maximum du nombre aléatoire", 0) + ")", 9];
      case "mm_input_int":
        return ps ? ["LIRE()", 9] : ["int(input(" + sub("TEXT", "la question à poser", 0) + "))", 9];
      case "mm_input_text":
        return ps ? ["LIRE()", 9] : ["input(" + sub("TEXT", "la question à poser", 0) + ")", 9];
      case "logic_compare":
        var op = b.getFieldValue("OP");
        return [sub("A", "un côté de la comparaison", 5) + " " + (ps ? CMP_PS[op] : CMP_PY[op]) + " " + sub("B", "un côté de la comparaison", 5), 4];
      case "logic_operation":
        var and = b.getFieldValue("OP") === "AND", p = and ? 2 : 1;
        return [sub("A", "une condition", p) + (ps ? (and ? " ET " : " OU ") : (and ? " and " : " or ")) + sub("B", "une condition", p + 1), p];
      case "logic_negate":
        return [(ps ? "NON " : "not ") + sub("BOOL", "la condition après « non »", 3), 3];
      case "math_arithmetic":
        var a = ARITH_PY[b.getFieldValue("OP")];
        return [sub("A", "un nombre du calcul", a[1]) + " " + (ps ? ARITH_PS[b.getFieldValue("OP")] : a[0]) + " " + sub("B", "un nombre du calcul", a[1] + 1), a[1]];
      case "math_modulo":
        return [sub("DIVIDEND", "le nombre à diviser", 6) + (ps ? " MOD " : " % ") + sub("DIVISOR", "le diviseur", 7), 6];
      default:
        ctx.missing.push("un bloc non pris en charge (« " + b.type + " »)");
        return ["?", 9];
    }
  }
  function cond(b, name, lang, ctx, label){ return expr(b.getInputTargetBlock(name), lang, ctx, label)[0]; }

  // Parcourt une suite de blocs et construit un arbre simple, commun aux trois vues
  function tree(first, ctx){
    var out = [];
    for(var b = first; b; b = b.getNextBlock()){
      if(b.isEnabled && !b.isEnabled()) continue;
      switch(b.type){
        case "variables_set":
          out.push({ t:"set", name:varName(b), value:b.getInputTargetBlock("VALUE") }); break;
        case "math_change":
          out.push({ t:"change", name:varName(b), delta:b.getInputTargetBlock("DELTA") }); break;
        case "text_print":
          out.push({ t:"print", items:[b.getInputTargetBlock("TEXT")] }); break;
        case "mm_print2":
          out.push({ t:"print", items:[b.getInputTargetBlock("A"), b.getInputTargetBlock("B")] }); break;
        case "mm_print3":
          out.push({ t:"print", items:[b.getInputTargetBlock("A"), b.getInputTargetBlock("B"), b.getInputTargetBlock("C")] }); break;
        case "controls_if":
          var branches = [];
          for(var i = 0; b.getInput("IF" + i); i++){
            branches.push({ cond:b.getInputTargetBlock("IF" + i), body:tree(b.getInputTargetBlock("DO" + i), ctx) });
          }
          out.push({ t:"if", branches:branches, otherwise:b.getInput("ELSE") ? tree(b.getInputTargetBlock("ELSE"), ctx) : null });
          break;
        case "controls_whileUntil":
          out.push({ t:"while", until:b.getFieldValue("MODE") === "UNTIL", cond:b.getInputTargetBlock("BOOL"),
                     body:tree(b.getInputTargetBlock("DO"), ctx) });
          break;
        case "controls_flow_statements":
          out.push({ t:"flow", brk:b.getFieldValue("FLOW") === "BREAK" }); break;
        default:
          ctx.missing.push("un bloc non pris en charge (« " + b.type + " »)");
      }
    }
    return out;
  }

  function isInput(v){ return v && (v.type === "mm_input_int" || v.type === "mm_input_text"); }

  /* ----- Python ----- */
  function toPython(nodes, ctx, indent){
    var pad = "    ".repeat(indent), lines = [];
    if(!nodes.length){ lines.push(pad + "pass"); return lines; }
    nodes.forEach(function(n){
      switch(n.t){
        case "set": lines.push(pad + n.name + " = " + expr(n.value, "py", ctx, "la valeur à mettre dans " + n.name)[0]); break;
        case "change":
          var d = expr(n.delta, "py", ctx, "la valeur à ajouter à " + n.name);
          lines.push(pad + n.name + " = " + n.name + " + " + (d[1] < 6 ? "(" + d[0] + ")" : d[0])); break;
        case "print":
          lines.push(pad + "print(" + n.items.map(function(v){ return expr(v, "py", ctx, "ce qu'il faut afficher")[0]; }).join(", ") + ")"); break;
        case "if":
          n.branches.forEach(function(br, i){
            lines.push(pad + (i ? "elif " : "if ") + expr(br.cond, "py", ctx, "la condition du « si »")[0] + ":");
            lines.push.apply(lines, toPython(br.body, ctx, indent + 1));
          });
          if(n.otherwise){ lines.push(pad + "else:"); lines.push.apply(lines, toPython(n.otherwise, ctx, indent + 1)); }
          break;
        case "while":
          var c = expr(n.cond, "py", ctx, "la condition du « tant que »");
          lines.push(pad + "while " + (n.until ? "not " + (c[1] < 3 ? "(" + c[0] + ")" : c[0]) : c[0]) + ":");
          lines.push.apply(lines, toPython(n.body, ctx, indent + 1));
          break;
        case "flow": lines.push(pad + (n.brk ? "break" : "continue")); break;
      }
    });
    return lines;
  }

  /* ----- Pseudo-code ----- */
  function toPseudo(nodes, ctx, indent){
    var pad = "  ".repeat(indent), lines = [];
    nodes.forEach(function(n){
      switch(n.t){
        case "set":
          if(isInput(n.value)){ expr(n.value, "ps", ctx); lines.push(pad + "LIRE(" + n.name + ")"); }
          else lines.push(pad + n.name + " ← " + expr(n.value, "ps", ctx)[0]);
          break;
        case "change": lines.push(pad + n.name + " ← " + n.name + " + " + expr(n.delta, "ps", ctx)[0]); break;
        case "print": lines.push(pad + "ECRIRE(" + n.items.map(function(v){ return expr(v, "ps", ctx)[0]; }).join(", ") + ")"); break;
        case "if":
          n.branches.forEach(function(br, i){
            lines.push(pad + (i ? "SINON SI " : "SI ") + expr(br.cond, "ps", ctx)[0] + " ALORS");
            lines.push.apply(lines, toPseudo(br.body, ctx, indent + 1));
          });
          if(n.otherwise){ lines.push(pad + "SINON"); lines.push.apply(lines, toPseudo(n.otherwise, ctx, indent + 1)); }
          lines.push(pad + "FINSI");
          break;
        case "while":
          var c = expr(n.cond, "ps", ctx)[0];
          lines.push(pad + "TANT QUE " + (n.until ? "NON (" + c + ")" : c) + " FAIRE");
          lines.push.apply(lines, toPseudo(n.body, ctx, indent + 1));
          lines.push(pad + "FINTANTQUE");
          break;
        case "flow": lines.push(pad + (n.brk ? "SORTIR DE LA BOUCLE" : "PASSER AU TOUR SUIVANT")); break;
      }
    });
    return lines;
  }

  /* ----- Organigramme (symboles NF Z67-010) ----- */
  var measureCtx = document.createElement("canvas").getContext("2d");
  function textW(s){ measureCtx.font = "600 13px Archivo, sans-serif"; return measureCtx.measureText(s).width; }
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var GAP = 28;

  function arrow(points){ return '<polyline class="fc-line" marker-end="url(#fc-arrow)" points="' + points.map(function(p){ return p[0] + "," + p[1]; }).join(" ") + '"/>'; }
  function line(points){ return '<polyline class="fc-line" points="' + points.map(function(p){ return p[0] + "," + p[1]; }).join(" ") + '"/>'; }
  function label(x, y, t, anchor){ return '<text class="fc-label" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || "middle") + '">' + t + "</text>"; }

  function shape(kind, txt){
    var tw = textW(txt), w, h = 40;
    if(kind === "term") w = Math.max(110, tw + 44);
    else if(kind === "io") w = Math.max(120, tw + 52);
    else if(kind === "proc") w = Math.max(110, tw + 32);
    else { w = Math.max(130, tw * 1.25 + 56); h = 64; }
    return { w:w, h:h, draw:function(cx, y){
      var x = cx - w / 2, s;
      if(kind === "term") s = '<rect class="fc-term" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="20"/>';
      else if(kind === "io") s = '<polygon class="fc-shape" points="' + (x + 12) + "," + y + " " + (x + w) + "," + y + " " + (x + w - 12) + "," + (y + h) + " " + x + "," + (y + h) + '"/>';
      else if(kind === "proc") s = '<rect class="fc-shape" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
      else s = '<polygon class="fc-dec" points="' + cx + "," + y + " " + (x + w) + "," + (y + h / 2) + " " + cx + "," + (y + h) + " " + x + "," + (y + h / 2) + '"/>';
      return s + '<text class="fc-text" x="' + cx + '" y="' + (y + h / 2 + 4.5) + '" text-anchor="middle">' + esc(txt) + "</text>";
    }};
  }

  function seq(items){
    if(!items.length) return { w:0, h:0, empty:true, draw:function(){ return ""; } };
    var w = Math.max.apply(null, items.map(function(i){ return i.w; }));
    var h = items.reduce(function(a, i){ return a + i.h; }, 0) + GAP * (items.length - 1);
    return { w:w, h:h, draw:function(cx, y){
      var s = "";
      items.forEach(function(it, k){
        if(k){ s += arrow([[cx, y - GAP], [cx, y - 3]]); }
        s += it.draw(cx, y);
        y += it.h + GAP;
      });
      return s;
    }};
  }

  function ifLayout(condTxt, yes, no){
    var D = shape("dec", condTxt), Y = seq(yes), N = seq(no);
    var colGap = 36, lw = Math.max(Y.w, 60), rw = Math.max(N.w, 60);
    var offL = Math.max(colGap / 2 + lw / 2, D.w / 2 + 16), offR = Math.max(colGap / 2 + rw / 2, D.w / 2 + 16);
    var ext = Math.max(offL + lw / 2, offR + rw / 2);
    var hb = Math.max(Y.h, N.h);
    var h = D.h + 22 + hb + 26;
    return { w:2 * ext, h:h, draw:function(cx, y){
      var s = D.draw(cx, y), vy = y + D.h / 2, top = y + D.h + 22, mergeY = top + hb + 26;
      var xl = cx - offL, xr = cx + offR;
      s += label(cx - D.w / 2 - 6, vy - 6, "oui", "end") + label(cx + D.w / 2 + 6, vy - 6, "non", "start");
      if(Y.empty){ s += line([[cx - D.w / 2, vy], [xl, vy], [xl, mergeY], [cx, mergeY]]); }
      else { s += arrow([[cx - D.w / 2, vy], [xl, vy], [xl, top - 3]]) + Y.draw(xl, top) + line([[xl, top + Y.h], [xl, mergeY], [cx, mergeY]]); }
      if(N.empty){ s += line([[cx + D.w / 2, vy], [xr, vy], [xr, mergeY], [cx, mergeY]]); }
      else { s += arrow([[cx + D.w / 2, vy], [xr, vy], [xr, top - 3]]) + N.draw(xr, top) + line([[xr, top + N.h], [xr, mergeY], [cx, mergeY]]); }
      return s + '<circle class="fc-dot" cx="' + cx + '" cy="' + mergeY + '" r="3"/>';
    }};
  }

  function whileLayout(condTxt, until, body){
    var D = shape("dec", condTxt), B = seq(body);
    var inner = Math.max(D.w, B.w, 60), margin = 30;
    var h = 18 + D.h + GAP + B.h + 18 + 22;
    return { w:inner + 2 * margin + 20, h:h, draw:function(cx, y){
      var yD = y + 18, vy = yD + D.h / 2, yB = yD + D.h + GAP, yBe = yB + (B.empty ? 0 : B.h);
      var xL = cx - inner / 2 - margin / 2, xR = cx + inner / 2 + margin / 2, exitY = yBe + 18 + 22;
      var s = line([[cx, y], [cx, y + 9]]) + arrow([[cx, y + 9], [cx, yD - 3]]);
      s += D.draw(cx, yD);
      s += label(cx + 6, yD + D.h + 14, until ? "non" : "oui", "start");
      s += label(cx + D.w / 2 + 6, vy - 6, until ? "oui" : "non", "start");
      if(B.empty) s += line([[cx, yD + D.h], [cx, yBe + 18]]);
      else s += arrow([[cx, yD + D.h], [cx, yB - 3]]) + B.draw(cx, yB) + line([[cx, yBe], [cx, yBe + 18]]);
      s += arrow([[cx, yBe + 18], [xL, yBe + 18], [xL, y + 9], [cx - 3, y + 9]]);
      s += line([[cx + D.w / 2, vy], [xR, vy], [xR, exitY], [cx, exitY]]);
      return s;
    }};
  }

  function toFlow(nodes, ctx){
    var items = [];
    nodes.forEach(function(n){
      switch(n.t){
        case "set":
          if(isInput(n.value)){ expr(n.value, "ps", ctx); items.push(shape("io", "Lire : " + n.name)); }
          else items.push(shape("proc", n.name + " ← " + expr(n.value, "ps", ctx)[0]));
          break;
        case "change": items.push(shape("proc", n.name + " ← " + n.name + " + " + expr(n.delta, "ps", ctx)[0])); break;
        case "print": items.push(shape("io", "Écrire : " + n.items.map(function(v){ return expr(v, "ps", ctx)[0]; }).join(", "))); break;
        case "if":
          // « sinon si » = nouveau losange dans la branche « non »
          var build = function(i){
            if(i >= n.branches.length) return n.otherwise ? toFlow(n.otherwise, ctx) : [];
            var br = n.branches[i];
            return [ifLayout(expr(br.cond, "ps", ctx)[0] + " ?", toFlow(br.body, ctx), build(i + 1))];
          };
          items.push.apply(items, build(0));
          break;
        case "while": items.push(whileLayout(expr(n.cond, "ps", ctx)[0] + " ?", n.until, toFlow(n.body, ctx))); break;
        case "flow": items.push(shape("proc", n.brk ? "Sortir de la boucle" : "Tour suivant")); break;
      }
    });
    return items;
  }

  function flowSvg(nodes, ctx){
    var all = seq([shape("term", "Début")].concat(toFlow(nodes, ctx), [shape("term", "Fin")]));
    var W = Math.ceil(all.w + 60), H = Math.ceil(all.h + 40);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Organigramme du programme">' +
      '<defs><marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fc-head" d="M0,0 L10,5 L0,10 z"/></marker></defs>' +
      all.draw(W / 2, 20) + "</svg>";
  }

  /* ----- Assemblage ----- */
  function translate(ws){
    var ctx = { missing:[], random:false }, nodes = [], stacks = 0, loose = 0;
    ws.getTopBlocks(true).forEach(function(b){
      if(b.outputConnection){ loose++; return; }
      stacks++;
      nodes = nodes.concat(tree(b, ctx));
    });
    var pyLines = toPython(nodes, ctx, 0);
    if(!nodes.length) pyLines = [];
    var python = (ctx.random ? "import random\n\n" : "") + pyLines.join("\n") + (pyLines.length ? "\n" : "");
    var pctx = { missing:[], random:false };
    var pseudo = ["DEBUT"].concat(toPseudo(nodes, pctx, 1), ["FIN"]).join("\n");
    var svg = flowSvg(nodes, { missing:[], random:false });
    var warnings = [];
    var seen = {};
    ctx.missing.forEach(function(m){ if(!seen[m]){ seen[m] = 1; warnings.push("Il manque " + m + "."); } });
    if(loose) warnings.push(loose === 1 ? "Un bloc n'est relié à rien : il est ignoré." : loose + " blocs ne sont reliés à rien : ils sont ignorés.");
    if(stacks > 1) warnings.push("Le programme est en " + stacks + " morceaux séparés : ils sont lus de haut en bas. Accrochez-les les uns sous les autres.");
    return { python:python, pseudo:pseudo, svg:svg, warnings:warnings, incomplete:ctx.missing.length > 0, empty:!nodes.length };
  }

  /* =====================================================
     3. Interface
     ===================================================== */
  var ws = Blockly.inject("blockly-area", {
    toolbox:TOOLBOX,
    media:"../assets/blockly/media/",
    renderer:"geras",
    trashcan:true,
    sounds:false,
    grid:{ spacing:24, length:2, colour:"#d9d9d4", snap:true },
    zoom:{ controls:true, wheel:true, startScale:0.9, maxScale:2, minScale:0.4 },
    move:{ scrollbars:true, drag:true, wheel:false }
  });

  var EXAMPLE_MAJORITE = {
    blocks:{ languageVersion:0, blocks:[{
      type:"variables_set", x:30, y:30, fields:{ VAR:{ id:"v-age" } },
      inputs:{ VALUE:{ block:{ type:"mm_input_int", inputs:{ TEXT:text("Quel est votre âge ? ") } } } },
      next:{ block:{ type:"controls_if", extraState:{ hasElse:true },
        inputs:{
          IF0:{ block:{ type:"logic_compare", fields:{ OP:"GTE" }, inputs:{
            A:{ block:{ type:"variables_get", fields:{ VAR:{ id:"v-age" } } } },
            B:{ block:{ type:"math_number", fields:{ NUM:18 } } } } } },
          DO0:{ block:{ type:"text_print", inputs:{ TEXT:text("Majeur") } } },
          ELSE:{ block:{ type:"text_print", inputs:{ TEXT:text("Mineur") } } }
        } } }
    }]},
    variables:[{ name:"age", id:"v-age" }]
  };

  var current = null, viewTimer = null;
  function refreshViews(){
    current = translate(ws);
    var lines = current.python ? current.python.replace(/\n$/, "").split("\n") : [];
    $("view-python").innerHTML = lines.length
      ? lines.map(function(l, i){ return '<span class="ln">' + (i + 1) + "</span>" + esc(l); }).join("\n")
      : '<span class="vide-msg">Assemblez des blocs : le code Python apparaîtra ici.</span>';
    $("view-pseudo").textContent = current.pseudo;
    $("view-flow").innerHTML = current.svg;
    var w = $("block-warnings");
    w.innerHTML = "";
    current.warnings.forEach(function(m){ var li = document.createElement("li"); li.textContent = m; w.appendChild(li); });
    w.hidden = !current.warnings.length;
  }
  ws.addChangeListener(function(e){
    if(e.isUiEvent) return;
    clearTimeout(viewTimer);
    viewTimer = setTimeout(function(){
      refreshViews();
      try{ store(KEY_BLOCKS, JSON.stringify(Blockly.serialization.workspaces.save(ws))); }catch(_){}
    }, 150);
  });

  // reprise du travail précédent
  var saved = restore(KEY_BLOCKS);
  if(saved){ try{ Blockly.serialization.workspaces.load(JSON.parse(saved), ws); }catch(e){ ws.clear(); } }
  refreshViews();

  /* Mode test : nombre « aléatoire » fixé */
  function fixedSecret(){
    if(!$("test-on").checked) return null;
    var v = parseInt($("test-value").value, 10);
    return isNaN(v) ? null : v;
  }

  /* Onglets de vues (Python / organigramme / pseudo-code) */
  $("btn-fullscreen").addEventListener("click", function(){
    var pane = $("views-pane");
    if(document.fullscreenElement) document.exitFullscreen();
    else if(pane.requestFullscreen) pane.requestFullscreen();
  });
  document.querySelectorAll(".view-tab[aria-controls]").forEach(function(t){
    t.addEventListener("click", function(){
      document.querySelectorAll(".view-tab[aria-controls]").forEach(function(o){ o.setAttribute("aria-selected", String(o === t)); });
      document.querySelectorAll(".view-pane").forEach(function(p){ p.hidden = p.id !== t.getAttribute("aria-controls"); });
    });
  });

  /* Onglets d'activité */
  function showTab(name){
    document.querySelectorAll(".act-tab").forEach(function(t){ t.setAttribute("aria-selected", String(t.dataset.tab === name)); });
    $("tab-blocs").hidden = name !== "blocs";
    $("tab-python").hidden = name !== "python";
    if(name === "blocs") setTimeout(function(){ Blockly.svgResize(ws); }, 0);
    store(KEY_TAB, name);
  }
  document.querySelectorAll(".act-tab").forEach(function(t){
    t.addEventListener("click", function(){ showTab(t.dataset.tab); });
  });
  window.addEventListener("resize", function(){ Blockly.svgResize(ws); });

  /* Exécution des blocs */
  async function runBlocks(){
    refreshViews();
    var out = $("blocks-output");
    if(current.empty){ out.innerHTML = ""; out.textContent = "Le programme est vide : assemblez d'abord des blocs."; return; }
    if(current.incomplete){
      out.innerHTML = "";
      var c = document.createElement("span"); c.className = "err";
      c.textContent = "Programme incomplet :\n• " + current.warnings.filter(function(w){ return /^Il manque/.test(w); }).join("\n• ") + "\n";
      out.appendChild(c);
      return;
    }
    $("btn-run-blocks").disabled = true;
    await SitePython.run(current.python, { output:out, filename:"<blocs>", fixedSecret:fixedSecret() });
    $("btn-run-blocks").disabled = false;
  }
  $("btn-run-blocks").addEventListener("click", runBlocks);

  $("btn-example").addEventListener("click", function(){
    if(ws.getAllBlocks(false).length && !confirm("Remplacer vos blocs par l'exemple de la majorité ?")) return;
    ws.clear();
    Blockly.serialization.workspaces.load(EXAMPLE_MAJORITE, ws);
  });
  $("btn-clear-blocks").addEventListener("click", function(){
    if(!ws.getAllBlocks(false).length || confirm("Effacer tous les blocs ?")) ws.clear();
  });

  function download(name, content, type){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type:type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }
  $("btn-export").addEventListener("click", function(){
    download("nombre-mystere-blocs.json", JSON.stringify(Blockly.serialization.workspaces.save(ws), null, 1), "application/json");
  });
  $("btn-import").addEventListener("click", function(){ $("file-blocks").click(); });
  $("file-blocks").addEventListener("change", function(){
    var f = this.files[0]; this.value = "";
    if(!f) return;
    f.text().then(function(t){
      try{ var data = JSON.parse(t); ws.clear(); Blockly.serialization.workspaces.load(data, ws); }
      catch(e){ alert("Ce fichier ne contient pas des blocs enregistrés depuis cette page."); }
    });
  });

  /* =====================================================
     4. Éditeur Python (activité 4)
     ===================================================== */
  var editor = SiteEditor.attach($("py-code"), $("py-gutter"), {
    onRun:function(){ runPython(); },
    onChange:function(v){ store(KEY_PYTHON, v); }
  });
  var savedPy = restore(KEY_PYTHON);
  editor.setValue(savedPy !== null && savedPy.trim() ? savedPy : PY_START);

  async function runPython(){
    $("btn-run-python").disabled = true;
    var r = await SitePython.run(editor.getValue(), { output:$("py-output"), filename:"<exec>", fixedSecret:fixedSecret() });
    if(r && r.errorLine) editor.setErrorLine(r.errorLine);
    $("btn-run-python").disabled = false;
  }
  $("btn-run-python").addEventListener("click", runPython);
  $("btn-reset-python").addEventListener("click", function(){
    if(confirm("Revenir au début du programme (les deux premières lignes du TP) ? Votre code actuel sera effacé.")) editor.setValue(PY_START);
  });
  $("btn-save-python").addEventListener("click", function(){ download("nombre_mystere.py", editor.getValue(), "text/x-python"); });
  $("btn-open-python").addEventListener("click", function(){ $("file-python").click(); });
  $("file-python").addEventListener("change", function(){
    var f = this.files[0]; this.value = "";
    if(f) f.text().then(function(t){ editor.setValue(t.replace(/\r\n/g, "\n")); });
  });

  /* Démarrage */
  showTab(restore(KEY_TAB) === "python" ? "python" : "blocs");
  var status = $("py-status");
  SitePython.load().then(function(){
    status.textContent = "Python prêt";
    status.className = "py-status ready";
  }, function(){
    status.textContent = "Python n'a pas pu se charger : rechargez la page";
    status.className = "py-status error";
  });

  window.NombreMystere = { workspace:ws, translate:function(){ return translate(ws); } };
})();
