const AI={
 prompt:"You are an institutional administrative report writing assistant. Convert the user's rough daily duty notes into a professional official duty report. Do not invent facts. Do not add activities not mentioned. Preserve the actual meaning. Improve grammar and structure. Use formal institutional language. Write in first person. Keep concise unless detailed mode is selected. Avoid exaggerated claims and repetition. Make the report suitable for submission to the Joint Director of Thaiba Garden Group of Institutions.",
 generate(notes,style="Formal"){
   const clean=notes.split(/\n+/).map(x=>x.replace(/^[•\-–—\d.)\s]+/,"").trim()).filter(Boolean);
   if(!clean.length)return "";
   const connectors=["I reviewed","I coordinated","I prepared","I followed up on","I worked on","I checked","I attended to","I updated"];
   const lines=clean.map((x,i)=>{
      let s=x.replace(/\s+/g," ").replace(/[.]+$/,"");
      if(style==="Concise") return s.charAt(0).toUpperCase()+s.slice(1)+".";
      const low=s.toLowerCase();
      if(/^(checked|check)\b/.test(low)) s="I reviewed "+s.replace(/^(checked|check)\s+/i,"");
      else if(/^talked\b|^spoke\b|^discussed\b/.test(low)) s="I held the necessary discussion regarding "+s.replace(/^(talked|spoke|discussed)\s+(with\s+)?/i,"");
      else if(/^(prepared|prepare)\b/.test(low)) s="I worked on "+s.replace(/^(prepared|prepare)\s+/i,"the preparation of ");
      else if(/^(updated|update)\b/.test(low)) s="I updated "+s.replace(/^(updated|update)\s+/i,"");
      else if(/^(attended|attendance)\b/.test(low)) s="I attended to "+s.replace(/^(attended|attendance)\s+/i,"");
      else if(!/^i\b/i.test(s)) s=connectors[i%connectors.length]+" "+s.charAt(0).toLowerCase()+s.slice(1);
      return s.replace(/\bI reviewed student attendance\b/i,"I reviewed the student attendance records").replace(/\bthe preparation of certificates\b/i,"the preparation of certificates")+".";
   });
   if(style==="Detailed") return "During the day, I carried out the assigned institutional duties with due attention and responsibility. "+lines.join(" ")+" Necessary follow-up was carried out in connection with the above activities.";
   if(style==="Administrative") return "During the day, I attended to the following institutional responsibilities. "+lines.join(" ");
   if(style==="Professional") return "During the day, I carried out the assigned duties in an organized manner. "+lines.join(" ");
   return "During the day, I carried out the assigned institutional duties with due attention and responsibility. "+lines.join(" ");
 }
};