function openTOC(path,volname,target){  
 	   var toc;
 	   var tocpref;
 	   try { 
 	   		tocpref = localStorage["FLP-toc-preference"];
 	   }
 	   catch (e) { 
 	   		//alert("Oops! Your browser has localStorage disabled. (Try enabling cookies.)");
 	   		//return;
 	   		tocpref = null;
 	   };
       if (tocpref == null) tocpref = "_toc";
       toc = volname + tocpref + ".html"   
       if (path != '') toc = path + "/" + toc;
       localStorage["FLP-location"] = toc;
       window.open(toc,target);
 }
 
 function setpathname(pathname) {
       localStorage["FLP-location"] = pathname;
       window.location.assign(pathname);
 }
 function openChapter(offset){   //offest is expected to be +1 or -1, or 0 to go to the TOC
    var lastChapter =[52,42,22]; //last chapter number of each volume
    var volstrings =["I","II","III"];
    var filepath = window.location.pathname;        
    var filename = filepath.substr(filepath.lastIndexOf("/")+1); 
   var volname = filename.match(/I+/);               
   var vol = volname[0].length-1; //0-based volume index 
    var chapname = filename.match(/\d+/);       
   var tocpref;
    try { 
   		tocpref = localStorage["FLP-toc-preference"];
   }
   catch (e) { 
   		//alert("Oops! Your browser has localStorage disabled. (If you're using Firefox try enabling cookies.)");
   		//return;
   		tocpref = null;
   }
   if (tocpref == null) tocpref = "_toc";

    if (chapname==null) {
    	   if (offset==0) {
    	       setpathname(filepath.replace(filename, "index.html"));
    	   }
    	   else {
    	   	  var v = ((vol + offset % 3) + 3) % 3;
    	   	  setpathname(filepath.replace(filename, volstrings[v] + tocpref + ".html"));
    	   }
    }      
    else {
       var chap = chapname[0];
       var n = Number(chap)+offset;   //new chapter number
 
       if (offset==0) {
              if (tocpref == null) tocpref = "_toc";
       		  setpathname(filepath.replace(filename,volname + tocpref + ".html"));
       }
       else {
	       //Note: front matter chapter numbers go from 89 to 92
	       if (n==93) n=1; else if (n==0) n=92;
	       if ((n>=1 && n<=lastChapter[vol]) || (n>=89 && n<=92)) {
	           var newChap = "0"+String(n);  //pad left with "0" in case n is a single-digit number
	           newChap = newChap.substr(newChap.length-2); //all chapter numbers have exactly 2 digits
                setpathname(filepath.replace(chap,newChap));

	       }
       }
    }
 }

function Goto(vol,chap,sec){
    var volstrings =["I","II","III"];
	var dest;
	var chapstr = "0"+String(chap);
	chapstr = chapstr.substr(chapstr.length-2);
	dest = volstrings[vol-1] + "_" + chapstr + ".html"
    if(typeof(sec)!=='undefined') {
    	dest += "#Ch" + String(chap) + "-S" + String(sec);
    }
    localStorage["FLP-location"] = dest;
	window.open(dest,'_parent');
}
