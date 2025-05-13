const socket = io();

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Set user email
  const payload = JSON.parse(atob(token.split('.')[1]));
  document.getElementById('userEmail').textContent = `Usuario: ${payload.email}`;

  // Update tables
  actualizarTablaUsuarios();
  actualizarTablaQRs();
  actualizarTablaVerificados();
  actualizarTablaSorteo();
  actualizarTablaGanadores();

  // Real-time updates
  socket.on('updateUsuarios', () => actualizarTablaUsuarios());
  socket.on('updateQRs', () => actualizarTablaQRs());
  socket.on('updateVerificados', () => actualizarTablaVerificados());
  socket.on('updateSorteo', () => actualizarTablaSorteo());
  socket.on('updateGanadores', () => actualizarTablaGanadores());
});

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

// Sección 1: Carga de Lista de Usuarios
document.getElementById('csvUsuarios').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('csv', file);
  try {
    const response = await fetch('/api/upload-csv', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const result = await response.json();
    document.getElementById('csvError').innerHTML = response.ok
      ? '<span style="color: green;">' + result.message + '</span>'
      : '<span style="color: red;">' + result.error + '</span>';
    if (response.ok) socket.emit('updateUsuarios');
    event.target.value = '';
  } catch (err) {
    document.getElementById('csvError').innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
  }
});

async function exportarUsuariosJSON() {
  try {
    const response = await fetch('/api/export-usuarios', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todoslosusuarios.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar JSON:', err);
  }
}

async function actualizarTablaUsuarios() {
  try {
    const response = await fetch('/api/usuarios', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const cuerpoTabla = document.getElementById('cuerpoTablaUsuarios');
    cuerpoTabla.innerHTML = '';
    data.usuarios.forEach(usuario => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${usuario.nombre}</td>
        <td>${usuario.apellidos}</td>
        <td>${usuario.telefono}</td>
      `;
      cuerpoTabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
  }
}

// Sección 2: Verificación de Teléfono y Generación de QR
async function verificarTelefono() {
  const telefono = document.getElementById('telefonoInput').value.trim();
  const resultDiv = document.getElementById('telefonoResult');
  const qrContainer = document.getElementById('qrContainer');

  qrContainer.innerHTML = '';
  resultDiv.innerHTML = '';

  try {
    const response = await fetch('/api/verificar-telefono', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ telefono })
    });
    const result = await response.json();

    if (response.ok) {
      const { id } = result;
      QRCode.toCanvas(id, { errorCorrectionLevel: 'H' }, (err, canvas) => {
        if (err) {
          resultDiv.innerHTML = '<span style="color: red;">Error al generar QR.</span>';
          return;
        }
        qrContainer.appendChild(canvas);
        resultDiv.innerHTML = '<span style="color: green;">QR (tipo SQRC simulado) generado correctamente.</span>';
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `sqrc_${telefono}.png`;
        a.click();
      });
      socket.emit('updateQRs');
    } else {
      resultDiv.innerHTML = '<span style="color: red;">' + result.error + '</span>';
    }
  } catch (err) {
    resultDiv.innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
  }
  document.getElementById('telefonoInput').value = '';
}

// Sección 3: Verificación de QR
async function actualizarTablaQRs() {
  try {
    const response = await fetch('/api/qrs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const cuerpoTabla = document.getElementById('cuerpoTablaQRs');
    cuerpoTabla.innerHTML = '';
    data.qrs.forEach(qr => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${qr.id}</td>
        <td>${qr.nombre_completo}</td>
        <td>${qr.telefono}</td>
      `;
      cuerpoTabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar QRs:', err);
  }
}

async function exportarQRsCSV() {
  try {
    const response = await fetch('/api/qrs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const csv = [
      'id,nombre_completo,telefono',
      ...data.qrs.map(qr => `${qr.id},${qr.nombre_completo},${qr.telefono}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrs_generados.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar CSV:', err);
  }
}

async function exportarQRsJSON() {
  try {
    const response = await fetch('/api/export-qrs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrsGenerados.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar JSON:', err);
  }
}

let stream = null;
let escaneando = false;

async function iniciarEscaneoQR() {
  const qrResult = document.getElementById('qrResult');
  try {
    const response = await fetch('/api/qrs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    if (data.qrs.length === 0) {
      qrResult.innerHTML = '<span style="color: red;">Carga primero el CSV de QRs.</span>';
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('video');
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        escaneando = true;
        document.getElementById('detenerEscaneo').disabled = false;
        escanearQR();
      }).catch(err => {
        qrResult.innerHTML = '<span style="color: red;">Error al reproducir el video: ' + err.message + '</span>';
        detenerEscaneoQR();
      });
    };
  } catch (err) {
    qrResult.innerHTML = '<span style="color: red;">Error al acceder a la cámara: ' + err.message + '</span>';
  }
}

function detenerEscaneoQR() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    escaneando = false;
    document.getElementById('detenerEscaneo').disabled = true;
    document.getElementById('qrResult').innerHTML = '';
  }
}

async function escanearQR() {
  if (!escaneando) return;

  const video = document.getElementById('video');
  const qrResult = document.getElementById('qrResult');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    requestAnimationFrame(escanearQR);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code) {
    try {
      const id = code.data;
      const response = await fetch('/api/verificar-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id })
      });
      const result = await response.json();

      if (response.ok) {
        socket.emit('updateVerificados');
        qrResult.innerHTML = '<span style="color: green;">Usuario verificado correctamente.</span>';
        alert(`Usuario verificado: ${result.verificacion.nombre_completo} (${result.verificacion.telefono})`);
      } else {
        qrResult.innerHTML = '<span style="color: red;">' + result.error + '</span>';
        if (result.qr) {
          alert(`Este QR ya ha sido verificado: ${result.qr.nombre_completo} (${result.qr.telefono})`);
        } else {
          alert('QR no encontrado en la lista');
        }
      }
    } catch (err) {
      qrResult.innerHTML = '<span style="color: red;">Error al verificar QR.</span>';
    }
    detenerEscaneoQR();
    return;
  }
  requestAnimationFrame(escanearQR);
}

document.getElementById('csvQRs').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('csv', file);
  try {
    const response = await fetch('/api/upload-qrs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const result = await response.json();
    document.getElementById('csvError').innerHTML = response.ok
      ? '<span style="color: green;">' + result.message + '</span>'
      : '<span style="color: red;">' + result.error + '</span>';
    if (response.ok) socket.emit('updateQRs');
    event.target.value = '';
  } catch (err) {
    document.getElementById('csvError').innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
  }
});

async function actualizarTablaVerificados() {
  try {
    const response = await fetch('/api/verificados', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const cuerpoTabla = document.getElementById('cuerpoTablaVerificados');
    cuerpoTabla.innerHTML = '';
    data.forEach(v => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${v.id}</td>
        <td>${v.nombre_completo}</td>
        <td>${v.telefono}</td>
        <td>${v.fecha_verificacion}</td>
      `;
      cuerpoTabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar verificados:', err);
  }
}

async function exportarVerificadosCSV() {
  try {
    const response = await fetch('/api/verificados', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const csv = [
      'id,nombre_completo,telefono,fecha_verificacion',
      ...data.map(v => `${v.id},${v.nombre_completo},${v.telefono},${v.fecha_verificacion}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios_verificados.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al exportar CSV:', err);
  }
}

// Sección 4: Sorteo
document.getElementById('csvSorteo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('csv', file);
  try {
    const response = await fetch('/api/upload-sorteo', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const result = await response.json();
    document.getElementById('csvError').innerHTML = response.ok
      ? '<span style="color: green;">' + result.message + '</span>'
      : '<span style="color: red;">' + result.error + '</span>';
    if (response.ok) socket.emit('updateSorteo');
    event.target.value = '';
  } catch (err) {
    document.getElementById('csvError').innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
  }
});

async function realizarSorteo() {
  const resultDiv = document.getElementById('sorteoResult');
  const rouletteDiv = document.getElementById('roulette');
  try {
    const response = await fetch('/api/sorteo', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (response.ok) {
      rouletteDiv.innerHTML = '';
      result.sorteoUsuarios.forEach(u => {
        const div = document.createElement('div');
        div.textContent = u.nombre_completo;
        rouletteDiv.appendChild(div);
      });

      const duration = 3000;
      const totalHeight = result.sorteoUsuarios.length * 50;
      rouletteDiv.style.animation = `spin ${duration}ms ease-in-out`;
      rouletteDiv.style.transform = `translateY(-${totalHeight}px)`;

      setTimeout(() => {
        rouletteDiv.style.animation = '';
        rouletteDiv.style.transform = '';
        resultDiv.innerHTML = `<span style="color: green;">Ganador: ${result.ganador.nombre_completo} (${result.ganador.telefono})</span>`;
        socket.emit('updateSorteo');
        socket.emit('updateGanadores');
      }, duration);
    } else {
      resultDiv.innerHTML = '<span style="color: red;">' + result.error + '</span>';
    }
  } catch (err) {
    resultDiv.innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
  }
}

async function actualizarTablaSorteo() {
  try {
    const response = await fetch('/api/sorteo', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const cuerpoTabla = document.getElementById('cuerpoTablaSorteo');
    cuerpoTabla.innerHTML = '';
    data.forEach(u => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${u.id}</td>
        <td>${u.nombre_completo}</td>
        <td>${u.telefono}</td>
      `;
      cuerpoTabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar sorteo:', err);
  }
}

async function actualizarTablaGanadores() {
  try {
    const response = await fetch('/api/ganadores', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const cuerpoTabla = document.getElementById('cuerpoTablaGanadores');
    cuerpoTabla.innerHTML = '';
    data.forEach(g => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${g.id}</td>
        <td>${g.nombre_completo}</td>
        <td>${g.telefono}</td>
        <td>${g.fecha_sorteo}</td>
      `;
      cuerpoTabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al cargar ganadores:', err);
  }
}

async function borrarDatos() {
  if (confirm('¿Estás seguro de que deseas borrar todos los datos? Esta acción no se puede deshacer.')) {
    try {
      const response = await fetch('/api/borrar-datos', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      document.getElementById('sorteoResult').innerHTML = '<span style="color: green;">' + result.message + '</span>';
      socket.emit('updateUsuarios');
      socket.emit('updateQRs');
      socket.emit('updateVerificados');
      socket.emit('updateSorteo');
      socket.emit('updateGanadores');
    } catch (err) {
      document.getElementById('sorteoResult').innerHTML = '<span style="color: red;">Error al conectar con el servidor.</span>';
    }
  }
}