(function() {
    // --- MANEJO DE INDENTACIÓN EN EL TEXTAREA ---
    $(document).on('keydown', '.code-input', function(e) {
        var selStart = this.selectionStart;
        var selEnd = this.selectionEnd;
        var $this = $(this);
        var value = $this.val();

        // MANEJO DE TAB (Insertar 4 espacios reales)
        if (e.key === 'Tab') {
            e.preventDefault();
            $this.val(value.substring(0, selStart) + "    " + value.substring(selEnd));
            this.selectionStart = this.selectionEnd = selStart + 4;
        }

        // MANEJO DE ENTER (Auto-indentación como un IDE real)
        if (e.key === 'Enter') {
            var lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
            var currentLine = value.substring(lineStart, selStart);
            
            // Extraer espacios o tabs iniciales
            var match = currentLine.match(/^\s*/);
            var indent = match ? match[0] : "";
            
            if (indent.length > 0) {
                e.preventDefault(); 
                
                var splitBefore = value.substring(0, selStart);
                var splitAfter = value.substring(selEnd);
                
                // Insertar salto de línea + la indentación capturada
                $this.val(splitBefore + "\n" + indent + splitAfter);
                
                this.selectionStart = this.selectionEnd = selStart + 1 + indent.length;
            }
        }
    });
})();