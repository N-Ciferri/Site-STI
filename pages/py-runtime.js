/* Moteur Python commun (Pyodide hébergé dans pages/pyodide/).
   - SitePython.load()          : charge Python une seule fois
   - SitePython.run(code, opts) : exécute un programme et affiche le résultat dans une console
   - SiteEditor.attach(...)     : zone de code avec numéros de ligne et indentation automatique
*/
(function(){
  "use strict";

  var PACKAGES_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
  var MAX_LINES = 200000;   // au-delà : on considère que le programme tourne en boucle sans fin
  var MAX_OUTPUT = 60000;   // caractères affichés au maximum

  /* ---------- Console ----------
     Le texte est d'abord gardé en mémoire puis écrit dans la page en une fois :
     une boucle qui affiche beaucoup ne fige pas le navigateur. */
  function Console(el){ this.el = el; this.parts = []; this.size = 0; this.full = false; }
  Console.prototype.clear = function(){ this.el.innerHTML = ""; this.parts = []; this.size = 0; this.full = false; };
  Console.prototype.append = function(text, cls){
    if(this.full) return;
    this.size += text.length;
    if(this.size > MAX_OUTPUT){
      this.full = true;
      this.parts.push(["\n… (affichage interrompu : trop de texte)\n", "info"]);
      throw new Error("SORTIE_PLEINE");
    }
    var last = this.parts[this.parts.length - 1];
    if(last && last[1] === (cls || "")) last[0] += text;
    else this.parts.push([text, cls || ""]);
  };
  Console.prototype.flush = function(){
    var el = this.el;
    this.parts.forEach(function(p){
      var span = document.createElement("span");
      if(p[1]) span.className = p[1];
      span.textContent = p[0];
      el.appendChild(span);
    });
    this.parts = [];
    el.scrollTop = el.scrollHeight;
  };
  Console.prototype.hint = function(text){
    this.flush();
    var d = document.createElement("span");
    d.className = "hint";
    d.textContent = text;
    this.el.appendChild(d);
  };
  Console.prototype.text = function(){
    return this.el.textContent + this.parts.map(function(p){ return p[0]; }).join("");
  };
  Console.prototype.newline = function(){
    var t = this.text();
    if(t && t.slice(-1) !== "\n"){ this.full = false; this.parts.push(["\n", ""]); }
  };

  /* ---------- Messages d'erreur en français ---------- */
  var HINTS = {
    SyntaxError: "Erreur de syntaxe : le code n'est pas écrit correctement. Vérifiez les parenthèses, les guillemets et les deux-points « : » à la fin des lignes if, elif, else, while, def…",
    IndentationError: "Erreur d'indentation : les espaces en début de ligne ne sont pas cohérents. Les lignes d'un même bloc doivent commencer au même niveau (4 espaces).",
    TabError: "Mélange de tabulations et d'espaces pour l'indentation : utilisez uniquement des espaces.",
    NameError: "Nom inconnu : une variable ou une fonction est utilisée avant d'avoir reçu une valeur, ou son nom est mal orthographié (attention aux majuscules et aux accents).",
    TypeError: "Erreur de type : une opération mélange des types incompatibles, par exemple un texte et un nombre. input() renvoie toujours du texte : utilisez int(input(...)) pour obtenir un nombre.",
    ValueError: "Valeur incorrecte : par exemple int(\"abc\"), ou une réponse vide. Il faut taper un nombre entier.",
    ZeroDivisionError: "Division par zéro.",
    IndexError: "Indice hors de la liste : les indices commencent à 0 et vont jusqu'à len(liste) - 1.",
    AttributeError: "Cet objet ne possède pas l'attribut ou la fonction demandée. Vérifiez l'orthographe (par exemple random.randint).",
    ModuleNotFoundError: "Module introuvable : vérifiez le nom après « import »."
  };

  function showError(out, err, filename, brief){
    var msg = String(err && err.message || err);
    var lines = msg.split("\n");
    if(brief){
      // programme en blocs : pas de numéro de ligne Python, seulement l'erreur et son explication
      var lastLine = lines.filter(function(l){ return l.trim(); }).pop() || msg;
      var t = (lastLine.match(/^(\w+)(?::|$)/) || [])[1];
      out.newline();
      out.parts.push([lastLine + "\n", "err"]);
      if(t && HINTS[t]) out.hint(HINTS[t]);
      return null;
    }
    var fileRe = new RegExp('File "' + filename.replace(/[<>]/g, "\\$&") + '"');
    var start = lines.findIndex(function(l){ return fileRe.test(l); });
    var shown = start >= 0 ? ["Traceback (most recent call last):"].concat(lines.slice(start)) : lines;
    shown = shown.filter(function(l, i, arr){
      if(/File "\/lib\/python|File "\/home\/pyodide|File "<site>/.test(l)) return false;
      if(i > 0 && /^\s/.test(l) && /File "\/lib\/python|File "\/home\/pyodide|File "<site>/.test(arr[i-1])) return false;
      return true;
    });
    out.newline();
    out.parts.push([shown.join("\n").trim() + "\n", "err"]);

    var nums = (msg.match(new RegExp('File "' + filename.replace(/[<>]/g, "\\$&") + '", line (\\d+)', "g")) || [])
      .map(function(m){ return +m.match(/(\d+)$/)[1]; });
    var errorLine = nums.length ? nums[nums.length - 1] : null;
    var last = lines.filter(function(l){ return l.trim(); }).pop() || "";
    var type = (last.match(/^(\w+)(?::|$)/) || [])[1];
    if(type && HINTS[type]) out.hint(HINTS[type] + (errorLine ? " (ligne " + errorLine + ")" : ""));
    return errorLine;
  }

  /* ---------- Chargement de Python ---------- */
  var pyodide = null, loading = null, current = null;

  function writer(cls){
    var decoder = new TextDecoder();
    return { isatty:false, write:function(buf){
      if(current) current.append(decoder.decode(buf, { stream:true }), cls);
      return buf.length;
    }};
  }

  window.siteAskInput = function(question){
    if(current) current.flush();
    var answer = window.prompt(question || "Entrée :", "");
    if(answer === null) return undefined;       // « Annuler » : None côté Python, le programme s'arrête
    if(current){
      if(question) current.append(question);
      current.append(answer + "\n", "in");
    }
    return answer;
  };

  /* Saisie directement dans la console : renvoie une promesse résolue quand l'élève appuie sur Entrée.
     SitePython.stop() la résout avec « undefined » (None en Python) pour arrêter le programme. */
  var pendingInput = null;
  window.siteConsoleInput = function(question){
    var out = current;
    if(!out) return Promise.resolve(undefined);
    out.flush();
    return new Promise(function(resolve){
      var line = document.createElement("span");
      line.className = "ask";
      if(question){ var q = document.createElement("span"); q.textContent = question; line.appendChild(q); }
      var field = document.createElement("input");
      field.type = "text";
      field.className = "console-input";
      field.autocomplete = "off";
      field.spellcheck = false;
      field.setAttribute("aria-label", question ? "Réponse à : " + question : "Réponse du programme");
      field.placeholder = "tapez votre réponse puis Entrée";
      line.appendChild(field);
      out.el.appendChild(line);
      out.el.scrollTop = out.el.scrollHeight;
      line.scrollIntoView({ block:"nearest" });
      field.focus({ preventScroll:true });
      pendingInput = function(value){
        pendingInput = null;
        var answer = document.createElement("span");
        answer.className = "in";
        answer.textContent = value === undefined ? "" : value;
        line.replaceChild(answer, field);
        line.appendChild(document.createTextNode("\n"));
        out.size += (question || "").length + (value || "").length + 1;
        resolve(value);
      };
      field.addEventListener("keydown", function(e){
        if(e.key === "Enter"){ e.preventDefault(); if(pendingInput) pendingInput(field.value); }
      });
    });
  };

  var SETUP = [
    "import builtins, sys",
    "from js import siteAskInput as _ask",
    "class ArretProgramme(Exception):",
    "    pass",
    "def _site_input(prompt=''):",
    "    sys.stdout.flush()",
    "    r = _ask(str(prompt))",
    "    if r is None:",
    "        raise ArretProgramme()",
    "    return r",
    "builtins.input = _site_input",
    "builtins.ArretProgramme = ArretProgramme",
    "from js import siteConsoleInput as _cin",
    "async def _site_ainput(prompt=''):",
    "    sys.stdout.flush()",
    "    r = await _cin(str(prompt))",
    "    if r is None:",
    "        raise ArretProgramme()",
    "    return r",
    "builtins._site_ainput = _site_ainput",
    "import ast, inspect",
    "class _SiteInput(ast.NodeTransformer):",
    "    def visit_Call(self, node):",
    "        self.generic_visit(node)",
    "        if isinstance(node.func, ast.Name) and node.func.id == 'input':",
    "            new = ast.Await(value=ast.Call(func=ast.Name(id='_site_ainput', ctx=ast.Load()), args=node.args, keywords=node.keywords))",
    "            return ast.copy_location(new, node)",
    "        return node",
    "def _site_input_hors_programme_principal(tree):",
    "    for n in ast.walk(tree):",
    "        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):",
    "            for m in ast.walk(n):",
    "                if isinstance(m, ast.Call) and isinstance(m.func, ast.Name) and m.func.id == 'input':",
    "                    return True",
    "    return False",
    "async def _site_exec(src, filename, ns):",
    "    tree = ast.parse(src, filename)",
    "    # input() du programme principal -> saisie dans la console ; dans une fonction -> fenêtre de saisie",
    "    if not _site_input_hors_programme_principal(tree):",
    "        tree = ast.fix_missing_locations(_SiteInput().visit(tree))",
    "    code = compile(tree, filename, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)",
    "    r = eval(code, ns)",
    "    if inspect.iscoroutine(r):",
    "        await r",
    "class BoucleInfinie(Exception):",
    "    pass",
    "_site_count = [0]",
    "def _site_trace(frame, event, arg):",
    "    f = frame.f_code.co_filename",
    "    if f == '<site>' or not f.startswith('<'):",
    "        return None",
    "    if event == 'line':",
    "        _site_count[0] += 1",
    "        if _site_count[0] > " + MAX_LINES + ":",
    "            raise BoucleInfinie()",
    "    return _site_trace",
    "import random as _site_random",
    "_site_random._site_orig = _site_random.randint",
    "def _site_prepare(fixed):",
    "    _site_count[0] = 0",
    "    if fixed is None:",
    "        _site_random.randint = _site_random._site_orig",
    "    else:",
    "        def _fixed_randint(a, b):",
    "            return fixed if a <= fixed <= b else _site_random._site_orig(a, b)",
    "        _site_random.randint = _fixed_randint"
  ].join("\n");

  function load(){
    if(loading) return loading;
    loading = loadPyodide({ indexURL: "pyodide/", packageBaseUrl: PACKAGES_URL }).then(function(py){
      pyodide = py;
      py.setStdout(writer());
      py.setStderr(writer("err"));
      py.setStdin({ stdin:function(){ var r = window.siteAskInput(""); return r === undefined ? "" : r; } });
      py.runPython(SETUP, { filename:"<site>" });
      return py;
    });
    return loading;
  }

  var running = false;

  /* opts : { output: élément console, filename: "<exec>", fixedSecret: nombre ou null } */
  async function run(code, opts){
    if(running) return { ok:false };
    running = true;
    var out = new Console(opts.output);
    var filename = opts.filename || "<exec>";
    out.clear();
    current = out;
    var result = { ok:false, errorLine:null };
    var ns = null;
    try{
      var py = await load();
      if(/^\s*(import|from)\s+\w/m.test(code)){
        await py.loadPackagesFromImports(code, { messageCallback:function(){}, errorCallback:function(){} });
      }
      if(opts.fixedSecret != null && /\brandom\b/.test(code)){
        out.parts.push(["Mode test : le nombre « aléatoire » vaut " + opts.fixedSecret + ".\n", "info"]);
      }
      // « undefined » devient None en Python (null deviendrait un objet JavaScript)
      py.globals.get("_site_prepare")(opts.fixedSecret == null ? undefined : opts.fixedSecret);
      ns = py.globals.get("dict")();
      py.runPython("import sys\nsys.settrace(_site_trace)", { filename:"<site>" });
      var g = py.globals;
      g.set("_site_src", code); g.set("_site_fn", filename); g.set("_site_ns", ns);
      try{
        await py.runPythonAsync("await _site_exec(_site_src, _site_fn, _site_ns)", { filename:"<site>" });
      } finally {
        py.runPython("import sys\nsys.settrace(None)\nsys.stdout.flush()", { filename:"<site>" });
      }
      out.newline();
      if(!out.text().replace(/^Mode test.*\n/, "")) out.parts.push(["(le programme n'a rien affiché)\n", "info"]);
      result.ok = true;
    }catch(e){
      var msg = String(e && e.message || e);
      out.newline();
      if(out.full || /SORTIE_PLEINE/.test(msg)){
        out.parts.push(["Programme arrêté : il a affiché trop de texte.\n", "err"]);
        out.hint("Votre programme tourne probablement en boucle sans fin : la condition du « tant que » ne devient jamais fausse. Vérifiez qu'une variable de la condition change bien à l'intérieur de la boucle.");
      } else if(/ArretProgramme/.test(msg)){
        out.parts.push(["Programme arrêté.\n", "info"]);
        result.ok = true;
      } else if(/BoucleInfinie/.test(msg)){
        out.parts.push(["Programme arrêté : il a exécuté plus de " + MAX_LINES.toLocaleString("fr-FR") + " instructions.\n", "err"]);
        out.hint("Votre programme tourne probablement en boucle sans fin : la condition du « tant que » ne devient jamais fausse. Vérifiez qu'une variable de la condition change bien à l'intérieur de la boucle.");
      } else if(!pyodide){
        out.parts.push(["Impossible de charger Python : " + msg + "\nRechargez la page.\n", "err"]);
      } else {
        result.errorLine = showError(out, e, filename, opts.briefErrors);
      }
    }finally{
      out.flush();
      if(ns) ns.destroy();
      current = null;
      running = false;
    }
    return result;
  }

  // Arrête un programme qui attend une réponse
  function stop(){ if(pendingInput) pendingInput(undefined); }

  window.SitePython = { load:load, run:run, stop:stop, isRunning:function(){ return running; },
                        isWaiting:function(){ return !!pendingInput; } };

  /* ---------- Zone de code ---------- */
  function attach(textarea, gutter, opts){
    opts = opts || {};
    var errorLine = null;

    function updateGutter(){
      var n = textarea.value.split("\n").length;
      var html = "";
      for(var i = 1; i <= n; i++) html += "<div" + (i === errorLine ? ' class="err"' : "") + ">" + i + "</div>";
      gutter.innerHTML = html;
      gutter.scrollTop = textarea.scrollTop;
    }
    function changed(){ errorLine = null; updateGutter(); if(opts.onChange) opts.onChange(textarea.value); }
    function insertText(text){
      if(!document.execCommand || !document.execCommand("insertText", false, text)){
        var s = textarea.selectionStart, e = textarea.selectionEnd, v = textarea.value;
        textarea.value = v.slice(0, s) + text + v.slice(e);
        textarea.selectionStart = textarea.selectionEnd = s + text.length;
        changed();
      }
    }

    textarea.addEventListener("input", changed);
    textarea.addEventListener("scroll", function(){ gutter.scrollTop = textarea.scrollTop; });
    textarea.addEventListener("keydown", function(e){
      var v = textarea.value, s = textarea.selectionStart, end = textarea.selectionEnd;
      if((e.ctrlKey || e.metaKey) && e.key === "Enter"){ e.preventDefault(); if(opts.onRun) opts.onRun(); return; }
      if(e.key === "Tab"){
        e.preventDefault();
        var lineStart = v.lastIndexOf("\n", s - 1) + 1;
        if(!e.shiftKey && s === end){ insertText("    "); return; }
        var lines = v.slice(lineStart, end).split("\n");
        var changedText = lines.map(function(l){ return e.shiftKey ? l.replace(/^ {1,4}|^\t/, "") : "    " + l; }).join("\n");
        textarea.selectionStart = lineStart; textarea.selectionEnd = end;
        insertText(changedText);
        textarea.selectionStart = lineStart; textarea.selectionEnd = lineStart + changedText.length;
        return;
      }
      if(e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey){
        e.preventDefault();
        var ls = v.lastIndexOf("\n", s - 1) + 1;
        var line = v.slice(ls, s);
        var indent = (line.match(/^[ \t]*/) || [""])[0];
        if(/:\s*(#.*)?$/.test(line)) indent += "    ";
        insertText("\n" + indent);
        return;
      }
      if(e.key === "Backspace" && s === end && s > 0){
        var before = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
        if(before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0){
          e.preventDefault();
          textarea.selectionStart = s - 4;
          insertText("");
        }
      }
    });

    updateGutter();
    return {
      setValue:function(text){ textarea.value = text; changed(); },
      getValue:function(){ return textarea.value; },
      setErrorLine:function(n){ errorLine = n; updateGutter(); }
    };
  }

  window.SiteEditor = { attach:attach };
})();
