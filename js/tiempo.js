/*------------------------------------------------------*/
/* Oliver Fabián Stetcu Stepanov | 2º DAW */
/*------------------------------------------------------*/
/* Obtengo información sobre el tiempo actual, previsto y contaminación, además de usar la nueva API de geodificación. */
/*------------------------------------------------------*/
// Variable global para el mapa
let mapaLeaflet;

// Verifico si se ha hecho click en el mapa
let esClickEnMapa = false; // Asumo que no es un click en el mapa

$(function () {
  // Si pulso el botón de ver el pronóstico del día de hoy
  $("#hoyBoton").click(function () {
    // Oculto el mapa si existe
    if (mapaLeaflet) {
      $("#map").hide();
    } //end else

    obtenerTiempoHoy();
  });

  // Si pulso el botón de ver el pronóstico de los próximos 10 días
  $("#diezDiasBoton").click(function () {
    // Oculto el mapa si existe
    if (mapaLeaflet) {
      $("#map").hide();
    }//end if

    obtenerPrediccionProximos10Dias();
  });

  // Si pulso el botón para obtener la posición GPS actual
  $("#averiguarPosicionActual").click(function () {
    // Obtengo la posición actual del GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (posicion) {
        let latitud = posicion.coords.latitude;
        let longitud = posicion.coords.longitude;

        // Si el mapa ya está inicializado, actualizo su vista
        if (mapaLeaflet) {
          mapaLeaflet.setView([latitud, longitud], 13);
          $("#map").show();
        } else {
          // Inicializo el mapa de Leaflet con la vista centrada en la ubicación actual
          mapaLeaflet = L.map("map").setView([latitud, longitud], 13); // El número 13 es un nivel de zoom arbitrario

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(mapaLeaflet);

          // Agrego evento de click al mapa
          mapaLeaflet.on('click', function (evento) {
            // Establezco la variable a true cuando se hace click en el mapa
            esClickEnMapa = true;

            // Obtengo las coordenadas de la posición donde se hizo click
            let latitudClick = evento.latlng.lat;
            let longitudClick = evento.latlng.lng;

            // Realizo la solicitud de previsión del día de hoy para las coordenadas clicadas
            obtenerDatosMeteorologicos(latitudClick, longitudClick);
          });

          // Muestro el mapa
          $("#map").show();
        } //end else
      });
    } else {
      console.error("¡La geolocalización no está soportada por este navegador!");
    } //end else
  });

  // Función para obtener el tiempo de hoy
  function obtenerTiempoHoy() {
    let ubicacion = $("#ubicacionCampo").val();
    const miApiKey = "8YFSDBKZ596B3AGHSGFWPMQMG";

    // Verifico si la ubicación contiene una coma
    if (!ubicacion.includes(",")) {
      ubicacion += ",es"; // Agrego ",es" al final si no hay coma
    } //end if

    $("#cambia").html("<img src='../assets/img/ajax-loader.gif'>"); // Mientras se carga

    // Esta consulta la realizaré con AJAX
    $.ajax({
      // EJ: https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/Sevilla/today?unitGroup=metric&key=8YFSDBKZ596B3AGHSGFWPMQMG&contentType=json&lang=es
      url: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${ubicacion}/today?unitGroup=metric&key=${miApiKey}&contentType=json&lang=es`,
      type: "GET",
      dataType: "json",
      
      // PRUEBAS
      // lang: 'es',
      // appid: miApiKey,
      // async: true,

      success: function (datosClima) {
        $("#mensajeError").empty(); // Borro el mensaje de error si existe
        console.log(datosClima);
        mostrarDatosTiempoHoy(datosClima);
      },//end success: function (datosClima)
      error: function (xhr, estado, errorProducido) {
        $("#mensajeError").text("¡ERROR!: NO se pudo obtener los datos del clima! Por favor, inténtalo de nuevo más tarde.");
        console.error("¡ERROR!: NO se pudo obtener el tiempo: " + errorProducido);
        console.error("Estado: " + estado);
      },//end error: function (xhr, estado, errorProducido)
      complete: function (xhr, estado) {
        console.log("Petición completa");
      },//end complete: function (xhr, estado)
    });
  } //end function obtenerTiempoHoy()

  // Función para mostrar la predicción del tiempo de hoy
  function mostrarDatosTiempoHoy(datosClima) {
    // Muestra solo los datos para el día de hoy
    let hoy = datosClima.days[0];

    let hoyDestacado = `<h2>· ${datosClima.address} 📌</h2>`;
    hoyDestacado += `<h3>Día de Hoy (${hoy.datetime}):</h3><ul>`;

    let detallesHoy = `<img src="../assets/ico/${hoy.icon}.png" alt="Icono del Tiempo"><br><br>`;
    detallesHoy += `<li>Temperatura máxima: ${hoy.tempmax}°C</li>`;
    detallesHoy += `<li>Temperatura mínima: ${hoy.tempmin}°C</li>`;

    // Compruebo si hay viento
    if (!hoy.windspeed == "0") {
      detallesHoy += `<li>Viento: ${hoy.windspeed} km/h</li>`;
      detallesHoy += `<li>Dirección del Viento: ${hoy.winddir}</li>`;
    } //end if

    detallesHoy += `<li>Estado del tiempo: ${hoy.conditions}</li>`;
    detallesHoy += `<li>Previsión: ${hoy.icon} - ${hoy.description}</li>`;

    // Compruebo si llueve o no, si llueve muestro "Sí" y si no llueve muestro "No"
    let llueve = hoy.precip !== null && hoy.precip !== 0.0 ? "Sí" : "No";
    let precipitacionLluvia = hoy.preciptype !== null ? "Hay precipitación" : "No hay precipitación (0).";
    detallesHoy += `<li>¿Llueve?: ${llueve}. Tipo de precipitación: ${precipitacionLluvia}</li>`;

    detallesHoy += `<li>Visibilidad: ${hoy.visibility} km</li>`;
    detallesHoy += `<li>Humedad: ${hoy.humidity}</li>`;

    // Compruebo si nieva o no, si nieva muestro "Sí" y si no nieva muestro "No"
    let nieve = hoy.snow !== null && hoy.snow !== 0.0 ? "Sí" : "No";
    detallesHoy += `<li>¿Nieva?: ${nieve}</li>`;

    // Agrego las estaciones meteorológicas
    detallesHoy += "<li>Estaciones Meteorológicas:</li><ul>";
    hoy.stations.forEach((estacion) => {
        detallesHoy += `<li>${estacion}</li>`;
    });
    detallesHoy += "</ul></ul>";

    // Compruebo si la ubicación es una ciudad o un pueblo
    obtenerInformacionCiudad();

    // Muestro detalles en el DOM
    $("#cambia").html(hoyDestacado + detallesHoy);

    // Muestro el mapa
    let latitud = datosClima.latitude;
    let longitud = datosClima.longitude;
    let mapaURL = `https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.1}, ${latitud - 0.1}, ${longitud + 0.1}, ${latitud + 0.1}&amp;layer=mapnik`;
    
    $("#mapa").attr("src", mapaURL);
  } //end

  // Función para obtener el tiempo de los próximos 10 días
  function obtenerPrediccionProximos10Dias() {
    let ubicacion = $("#ubicacionCampo").val();
    const miApiKey = "8YFSDBKZ596B3AGHSGFWPMQMG";

    // Verifico si la ubicación contiene una coma
    if (!ubicacion.includes(",")) {
      ubicacion += ",es"; // Agrego ",es" al final si no hay coma
    } //end if

    $("#cambia").html("<img src='../assets/img/ajax-loader.gif'>"); // Mientras se carga

    // Construye la URL de la solicitud
    let url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${ubicacion}/next10days?unitGroup=metric&key=${miApiKey}&contentType=json&lang=es`;

    // Esta consulta la realizaré con FETCH
    fetch(url)
      .then((respuesta) => {
        if (!respuesta.ok) {
          $("#mensajeError").text("¡ERROR!: NO se pudieron obtener los datos del pronóstico para los próximos 10 días.");
          console.error("¡ERROR!: NO se pudo obtener el tiempo: " + errorProducido);
          console.error("Estado: " + estado);
        } else {
          $("#mensajeError").empty(); // Borro el mensaje de error si existe
        } //end else
        return respuesta.json();
      })//end then
      .then((datosPrediccion) => {
        console.log(datosPrediccion);
        mostrarResumenPrediccionProximos10Dias(datosPrediccion);
      })//end then
      .catch((error) => {
        console.error(
          "¡ERROR!: NO se pudieron obtener los datos del pronóstico para los próximos 10 días:",
          error.message
        );//end catch
      });
  } //end function obtenerPrediccionProximos10Dias()

  function mostrarResumenPrediccionProximos10Dias(datosClima10dias) {
    // Muestro los datos para los próximos 10 días
    let detalles10Dias = `<h2>· ${datosClima10dias.address} - Próximos 10 días 📌</h2>`;

    datosClima10dias.days.slice(1).forEach((dia) => {
      detalles10Dias += `<h3>Fecha: ${dia.datetime}</h3>`;
      detalles10Dias += `<img src="../assets/ico/${dia.icon}.png" alt="Icono del Tiempo">`;
      detalles10Dias += `<ul><li>Temperatura máxima al mediodía: ${dia.tempmax}°C</li>`;
      detalles10Dias += `<li>Temperatura mínima por la noche: ${dia.tempmin}°C</li></ul>`;
    });

    // Muestro detalles en el DOM
    $("#cambia").html(detalles10Dias);

    // Muestro el mapa
    let latitud = datosClima10dias.latitude;
    let longitud = datosClima10dias.longitude;
    let mapaURL = `https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.1}, ${latitud - 0.1}, ${longitud + 0.1}, ${latitud + 0.1}&amp;layer=mapnik`;

    $("#mapa").attr("src", mapaURL);

    // Oculto los datos adicionales
    $("#datosAdicionales").html("");
  } //end function mostrarResumenPrediccionProximos10Dias(datosPrediccion)

  // Función para obtener información de la ciudad o pueblo usando la API de GeoDB
  function obtenerInformacionCiudad() {
    let ubicacion = $("#ubicacionCampo").val();
    let ubicacionSinES;

    // Verifico si la ubicación contiene una coma
    if (ubicacion.includes(",es")) {
      // Quito el ",es" de la ubicación para pasarlo como parámetro en la URL
      ubicacionSinES = ubicacion.substr(0, ubicacion.length - 3);
    } else {
      ubicacionSinES = ubicacion;
    } //end else

    // Realizo la solicitud a la API de GeoDB con Axios
    // EJ: http://geodb-free-service.wirefreethought.com/v1/geo/cities?namePrefix=Granada&limit=1&offset=0&hateoasMode=false
    axios.get(`http://geodb-free-service.wirefreethought.com/v1/geo/cities?namePrefix=${ubicacionSinES}&limit=1&offset=0&hateoasMode=false&languageCode=es`)
      .then(function (datosUbicacion) {
        // Obtengo los datos
        let ubiInfo = datosUbicacion.data;

        // Verifico si se obtuvieron datos válidos de ciudad o país
        if (ubiInfo && ubiInfo.data && ubiInfo.data.length > 0 && !esClickEnMapa) {
          
          // Guardo la información en el DOM
          let infoAdicionalUbi = `<h3>· Información de la ubicación ·</h3>`;
          infoAdicionalUbi += `<ul><li>Población: ${ubiInfo.data[0].population} personas.</li>`;
          infoAdicionalUbi += `<li>País: ${ubiInfo.data[0].country}</li>`;
          infoAdicionalUbi += `<li>Región: ${ubiInfo.data[0].region}</li></ul>`;

          // Muestro los datos
          $("#datosAdicionales").html(infoAdicionalUbi);
        } else {
          // Oculto los detalles adicionales si no se encontraron datos válidos
          $("#datosAdicionales").html("");
        }//end else
      }) //end then
      .catch(function (error) {
        console.error("¡ERROR!: NO se pudo obtener información de la ciudad:", error.message);
      });//end catch
  } //end function obtenerInformacionCiudad()

  // Función para obtener datos meteorológicos por coordenadas
  function obtenerDatosMeteorologicos(latitud, longitud) {
    const miApiKey = "8YFSDBKZ596B3AGHSGFWPMQMG";

    // Realizo la solicitud a la API de Visual Crossing utilizando las coordenadas
    $.ajax({
        url: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${latitud},${longitud}/today?unitGroup=metric&key=${miApiKey}&contentType=json&lang=es`,
        type: "GET",
        dataType: "json",

        success: function (datosClima) {
          $("#mensajeError").empty(); // Borro el mensaje de error si existe
          console.log(datosClima);
          mostrarDatosTiempoHoy(datosClima);
        },//end success: function (datosClima)
        error: function (xhr, estado, errorProducido) {
          $("#mensajeError").text("¡ERROR!: No se pudo obtener los datos del clima. Por favor, inténtalo de nuevo más tarde.");
          console.error("¡ERROR!: No se pudo obtener el tiempo: " + errorProducido);
          console.error("Estado: " + estado);
        },//end error: function (xhr, estado, errorProducido)
        complete: function (xhr, estado) {
          console.log("Petición completa");
        },//end complete: function (xhr, estado)      
    });
  }//end function obtenerDatosMeteorologicos(latitud, longitud)
});
/*------------------------------------------------------*/
