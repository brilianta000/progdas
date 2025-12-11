document.addEventListener("DOMContentLoaded", () => {

    // Elemen
    const loginForm = document.getElementById("login-form");
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const navLinks = sidebar ? sidebar.querySelectorAll("a") : [];
    const $ = id => document.getElementById(id);

    // API
    function api(action, method = "GET", data = null) {
        const url = `api.php?action=${action}`;
        const cfg = { method, headers: {} };
        if (data) {
            cfg.headers["Content-Type"] = "application/json";
            cfg.body = JSON.stringify(data);
        }
        return fetch(url, cfg).then(r => r.json());
    }

    function showPage(id) {
        if (id === "dashboard-page") {
            loadDashboard();
        }

        document.querySelectorAll(".content-section").forEach(s => s.classList.add("hidden"));
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");

        const mainContent = document.getElementById("main-content");
        if (id === "login-page") {
            if (mainContent) mainContent.classList.add("hidden");
            if (sidebar) sidebar.classList.add("hidden");
            if (menuToggle) menuToggle.classList.add("hidden");
        } else {
            if (mainContent) mainContent.classList.remove("hidden");
            if (sidebar) sidebar.classList.remove("hidden");
            if (menuToggle) menuToggle.classList.remove("hidden");

            // load page data
            loadSupplierTable();
            loadSupplierDropdown();
            loadBarangTable();
            loadStokDropdown();
            updateDashboardStats();
        }
    }

    showPage("login-page");
// LOGIIIN
    if (loginForm) {
        loginForm.onsubmit = e => {
            e.preventDefault();
            const u = $("username").value.trim();
            const p = $("password").value.trim();
            if (u === "admin" && p === "admin") {
                showPage("dashboard-page");
            } else {
                alert("Login gagal — cek username/password");
            }
        };
    }
    // dash board
    function loadDashboard() {
        Promise.all([
            api("report"),       
            api("get_suppliers") 
        ]).then(([barang, suppliers]) => {

            document.getElementById("dash-total-barang").innerText = barang.length;
            document.getElementById("dash-total-supplier").innerText = suppliers.length;
            const totalItem = barang.reduce((sum, b) => sum + parseInt(b.jumlah), 0);
            document.getElementById("dash-total-item").innerText = totalItem;
            const supplierAktif = new Set(barang.map(b => b.supplier_id)).size;
            document.getElementById("dash-supplier-aktif").innerText = supplierAktif;
            const stokRendah = barang.filter(b => b.jumlah < 5).length;
            document.getElementById("dash-stok-rendah").innerText = stokRendah;

            // Barang terbanyak
            if (barang.length > 0) {
                const maxB = barang.reduce((a, b) => a.jumlah > b.jumlah ? a : b);
                document.getElementById("dash-barang-terbanyak").innerText =
                    `${maxB.nama} (${maxB.jumlah})`;
            }

            // Barang tersedikit
            if (barang.length > 0) {
                const minB = barang.reduce((a, b) => a.jumlah < b.jumlah ? a : b);
                document.getElementById("dash-barang-tersedikit").innerText =
                    `${minB.nama} (${minB.jumlah})`;
            }
        });
    }

// sidebar
    if (menuToggle) {
        menuToggle.onclick = () => sidebar.classList.toggle("active");
    }
    navLinks.forEach(a => {
        a.onclick = e => {
            e.preventDefault();
            const page = a.dataset.page;
            showPage(page);
        };
    });

    // sup lier
    const tambahSupplierBtn = $("tambah-supplier-btn");
    const addSupplierForm = $("add-supplier-form");
    const formSupplier = $("form-supplier-add");

    window.hideSupplierForm = () => {
        if (addSupplierForm) addSupplierForm.classList.add("hidden");
    };

    if (tambahSupplierBtn) {
        tambahSupplierBtn.onclick = () => {
            if (addSupplierForm) addSupplierForm.classList.remove("hidden");
        };
    }

    if (formSupplier) {
        formSupplier.onsubmit = function (e) {
            e.preventDefault();
            const payload = {
                nama: $("supplier-nama").value.trim(),
                contact: $("supplier-contact").value.trim(),
                alamat: $("supplier-alamat").value.trim()
            };

            api("add_supplier", "POST", payload)
                .then(res => {
                    if (res.error) return alert(res.error);
                    hideSupplierForm();
                    formSupplier.reset();
                    loadSupplierTable();
                    loadSupplierDropdown();
                })
                .catch(err => {
                    console.error("add_supplier error", err);
                    alert("Terjadi kesalahan saat menyimpan supplier.");
                });
        };
    }

    function loadSupplierTable() {
        api("get_suppliers")
            .then(list => {
                const tbody = $("supplier-body");
                if (!tbody) return;
                tbody.innerHTML = "";
                list.forEach(s => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${escapeHtml(s.nama)}</td>
                        <td>${escapeHtml(s.contact)}</td>
                        <td>${escapeHtml(s.alamat)}</td>
                        <td><button class="btn btn-delete" data-id="${s.id}">HAPUS</button></td>
                    `;
                    tbody.appendChild(tr);
                });

                tbody.querySelectorAll("button[data-id]").forEach(btn => {
                    btn.onclick = () => {
                        const id = parseInt(btn.getAttribute("data-id"), 10);
                        if (!confirm("Hapus supplier?")) return;
                        api("delete_supplier", "POST", { id })
                            .then(() => {
                                loadSupplierTable();
                                loadSupplierDropdown();
                            })
                            .catch(err => {
                                console.error("delete_supplier", err);
                                alert("Gagal hapus supplier");
                            });
                    };
                });

            })
            .catch(err => console.error("loadSupplierTable", err));
    }

    function loadSupplierDropdown() {
        api("get_suppliers")
            .then(list => {
                const sel = $("barang-supplier");
                if (!sel) return;
                sel.innerHTML = `<option value="">-- Pilih Supplier --</option>`;
                list.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.id;
                    opt.textContent = s.nama;
                    sel.appendChild(opt);
                });
                document.getElementById("stat-total-supplier").textContent = list.length;
            })
            .catch(err => console.error("loadSupplierDropdown", err));
    }

    // barang 
    const tambahBarangBtn = $("tambah-barang-btn");
    const addBarangForm = $("add-barang-form");
    const formBarang = $("form-barang-add");

    window.hideBarangForm = () => {
        if (addBarangForm) addBarangForm.classList.add("hidden");
    };

    if (tambahBarangBtn) {
        tambahBarangBtn.onclick = () => {
            if (addBarangForm) addBarangForm.classList.remove("hidden");
            api("report").then(list => {
                const next = list.length + 1;
                const el = $("barang-code");
                if (el) el.value = next;
            });
        };
    }

    if (formBarang) {
        formBarang.onsubmit = function (e) {
            e.preventDefault();
            const payload = {
                nama: $("barang-nama").value.trim(),
                jumlah: parseInt($("barang-jumlah").value, 10) || 0,
                supplier_id: parseInt($("barang-supplier").value, 10) || 0
            };

            api("add_barang", "POST", payload)
                .then(res => {
                    if (res.error) return alert(res.error);
                    hideBarangForm();
                    formBarang.reset();
                    loadBarangTable();
                    loadStokDropdown();
                })
                .catch(err => {
                    console.error("add_barang", err);
                    alert("Gagal tambah barang");
                });
        };
    }

    function loadBarangTable() {
        Promise.all([api("report"), api("get_suppliers")])
            .then(([barangList, suppliers]) => {
                const tbody = $("barang-body");
                if (!tbody) return;
                tbody.innerHTML = "";

                barangList.forEach(b => {
                    const sup = suppliers.find(s => s.id == b.supplier_id);
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${escapeHtml(String(b.kode))}</td>
                        <td>${escapeHtml(b.nama)}</td>
                        <td>${escapeHtml(sup ? sup.nama : "-")}</td>
                        <td>${escapeHtml(String(b.jumlah))}</td>
                        <td><button class="btn btn-delete white-delete" data-id="${b.id}">HAPUS</button></td>
                    `;
                    tbody.appendChild(tr);
                });

                tbody.querySelectorAll("button[data-id]").forEach(btn => {
                    btn.onclick = () => {
                        const id = parseInt(btn.getAttribute("data-id"), 10);
                        if (!confirm("Hapus barang?")) return;
                        api("delete_barang", "POST", { id })
                            .then(() => {
                                loadBarangTable();
                                loadStokDropdown();
                            })
                            .catch(err => {
                                console.error("delete_barang", err);
                                alert("Gagal hapus barang");
                            });
                    };
                });

                document.getElementById("stat-total-barang").textContent = barangList.length;
                const low = barangList.filter(x => x.jumlah <= (x.reorder_level ?? 0)).length;
                document.getElementById("stat-stok-rendah").textContent = low;

            })
            .catch(err => console.error("loadBarangTable", err));
    }

    // stok ada?
    function loadStokDropdown() {
        api("report").then(list => {
            const sel = $("select-barang-stok");
            if (!sel) return;
            sel.innerHTML = `<option value="">-- Pilih Barang --</option>`;
            list.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b.id;
                opt.textContent = `${b.kode} | ${b.nama}`;
                sel.appendChild(opt);
            });
        }).catch(err => console.error("loadStokDropdown", err));
    }


    const selectStok = $("select-barang-stok");
    const stokDetail = $("stok-detail-table");
    const stokJumlahAkhir = $("stok-jumlah-akhir");
    const stokBertambah = $("stok-bertambah");
    const stokBerkurang = $("stok-berkurang");
    const stokKeterangan = $("stok-keterangan");
    const formStok = $("form-stok-change");

    if (selectStok) {
        selectStok.onchange = function () {
            const id = parseInt(this.value, 10);
            if (!id) {
                if (stokDetail) stokDetail.classList.add("hidden");
                if (stokJumlahAkhir) stokJumlahAkhir.value = "";
                return;
            }
            api("report").then(list => {
                const b = list.find(it => it.id == id);
                if (!b) return;
                if (stokDetail) {
                    stokDetail.classList.remove("hidden");
                    stokDetail.innerHTML = `
                        <table>
                            <tbody>
                                <tr><td>KODE</td><td>${escapeHtml(String(b.kode))}</td></tr>
                                <tr><td>NAMA</td><td>${escapeHtml(b.nama)}</td></tr>
                                <tr><td>JUMLAH</td><td>${escapeHtml(String(b.jumlah))}</td></tr>
                            </tbody>
                        </table>
                    `;
                }
                if (stokJumlahAkhir) stokJumlahAkhir.value = b.jumlah;
            });
        };
    }

    if (formStok) {
        formStok.onsubmit = function (e) {
            e.preventDefault();
            const id = parseInt((selectStok && selectStok.value) || 0, 10);
            if (!id) return alert("Pilih barang terlebih dahulu");
            const tambah = parseInt(stokBertambah.value || 0, 10);
            const kurang = parseInt(stokBerkurang.value || 0, 10);
            if (tambah && kurang) return alert("Tidak boleh tambah dan kurang bersamaan");
            const perubahan = tambah ? tambah : -kurang;
            if (perubahan === 0) return alert("Isi perubahan stok");
            const ket = stokKeterangan ? stokKeterangan.value : "";

            api("stok_change", "POST", {
                id, bertambah: tambah, berkurang: kurang, keterangan: ket
            }).then(res => {
                if (res.error) return alert(res.error);
                alert("Stok diperbarui");
                loadBarangTable();
                loadStokDropdown();
                if (selectStok) selectStok.value = "";
                if (stokDetail) stokDetail.classList.add("hidden");
                if (stokJumlahAkhir) stokJumlahAkhir.value = "";
                if (stokBertambah) stokBertambah.value = "";
                if (stokBerkurang) stokBerkurang.value = "";
                if (stokKeterangan) stokKeterangan.value = "";
            }).catch(err => {
                console.error("stok_change", err);
                alert("Gagal update stok");
            });
        };
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function updateDashboardStats() {
    }

});
