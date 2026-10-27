import io, json
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # carpeta proyecto/
# Copia de prueba local: sin base de datos, clave del panel 1234 y 48 productos de muestra
s = io.open(os.path.join(RAIZ, "salida", "index-v2.html"), encoding="utf-8").read()
s = s.replace('    clave: "",', '    clave: "1234",', 1)
s = s.replace('      url:   "https://nuioyiwjiufaddwqbxoj.supabase.co",', '      url:   "",', 1)
cats = ["Pañales Bebés","Leches","Lactancia y Alimentación","Toallitas Húmedas",
        "Higiene y cuidado","Accesorios","Oleos/Algodón","Adultos","Para Mamá",
        "Combos/Sets de regalo","Decoración","Perfumeria"]
nombres = ["Pañales Pampers Premium Care Talle M x 50",
           "Toallitas Húmedas Huggies One & Done x 184",
           "Leche Nido Fortificada 750g","Óleo Calcáreo Algabo 200ml",
           "Body manga larga algodón recién nacido",
           "Shampoo Johnson's Baby sin lágrimas 400ml"]
demo = [{"id":"d%02d"%i,"nombre":nombres[i%len(nombres)]+" "+str(i),
         "categoria":cats[i%len(cats)],"subcategoria":"Pack",
         "marca":["Pampers","Huggies","Johnson","Chicco"][i%4],
         "precio":1000*(i+3),"descripcion":"Descripción del producto %d."%i,
         "imagenes":[],"variedades":[],"visible":True,
         "destacado":i%7==0,"masvendido":i%6==0,
         "oferta":i%5==0,"descuento":15 if i%5==0 else 0,"orden":i} for i in range(48)]
s = s.replace("    demo: []", "    demo: " + json.dumps(demo, ensure_ascii=False), 1)
io.open(os.path.join(RAIZ, "salida", "prueba-compra.html"),"w",encoding="utf-8").write(s)
print("ok")
