// Indonesian administrative hierarchy data
// Country -> Province -> City/Regency -> District (Kecamatan) -> Village (Kelurahan/Desa) -> RW -> RT

export interface ProvinceData {
  province: string
  cities: CityData[]
}

export interface CityData {
  city: string
  districts: string[]
}

// Major Indonesian provinces with their cities/regencies and key districts
export const INDONESIA_LOCATIONS: ProvinceData[] = [
  {
    province: "DKI Jakarta",
    cities: [
      { city: "Jakarta Pusat", districts: ["Menteng", "Cempaka Putih", "Senen", "Johar Baru", "Kemayoran", "Sawah Besar", "Tanah Abang"] },
      { city: "Jakarta Utara", districts: ["Tanjung Priok", "Koja", "Kelapa Gading", "Pademangan", "Penjaringan", "Cilincing"] },
      { city: "Jakarta Barat", districts: ["Grogol Petamburan", "Taman Sari", "Cengkareng", "Kalideres", "Kebon Jeruk", "Palmerah", "Kembangan", "Tambora"] },
      { city: "Jakarta Selatan", districts: ["Kebayoran Baru", "Kebayoran Lama", "Pesanggrahan", "Cilandak", "Pasar Minggu", "Jagakarsa", "Mampang Prapatan", "Pancoran", "Tebet", "Setiabudi"] },
      { city: "Jakarta Timur", districts: ["Jatinegara", "Matraman", "Pulogadung", "Cakung", "Cipayung", "Ciracas", "Duren Sawit", "Kramat Jati", "Makasar", "Pasar Rebo"] },
      { city: "Kepulauan Seribu", districts: ["Pulau Tidung", "Pulau Pari", "Pulau Harapan", "Pulau Kelapa"] },
    ],
  },
  {
    province: "Jawa Barat",
    cities: [
      { city: "Bandung", districts: ["Bandung Wetan", "Coblong", "Sukasari", "Cibeunying Kaler", "Cibeunying Kidul", "Sumur Bandung", "Regol", "Bojongloa", "Andir", "Cicendo", "Kiaracondong", "Lengkong", "Antapani", "Arcamanik", "Gedebage"] },
      { city: "Bekasi", districts: ["Bekasi Timur", "Bekasi Barat", "Rawalumbu", "Mustika Jaya", "Bantar Gebang", "Pondok Gede", "Jatiasih", "Medan Satria"] },
      { city: "Depok", districts: ["Pancoran Mas", "Cimanggis", "Sukmajaya", "Cilodong", "Tapos", "Beji", "Limo", "Cinere", "Sawangan", "Bojongsari"] },
      { city: "Bogor", districts: ["Bogor Tengah", "Bogor Utara", "Bogor Selatan", "Bogor Timur", "Bogor Barat", "Tanah Sereal", "Cibinong", "Ciawi", "Cijeruk"] },
      { city: "Cimahi", districts: ["Cimahi Utara", "Cimahi Tengah", "Cimahi Selatan"] },
      { city: "Cirebon", districts: ["Kejaksan", "Lemahwungkuk", "Pekalipan", "Harjamukti", "Kesambi"] },
      { city: "Sukabumi", districts: ["Cikole", "Citamiang", "Cibeureum", "Lembursitu", "Warudoyong", "Gunungpuyuh"] },
      { city: "Karawang", districts: ["Karawang Timur", "Karawang Barat", "Telukjambe", "Klari", "Rengasdengklok"] },
      { city: "Purwakarta", districts: ["Purwakarta", "Bungursari", "Jatiluhur", "Campaka"] },
      { city: "Tasikmalaya", districts: ["Tawang", "Cihideung", "Indihiang", "Kawalu", "Mangkubumi"] },
      { city: "Cianjur", districts: ["Cianjur", "Cilaku", "Karangtengah", "Pacet"] },
      { city: "Garut", districts: ["Garut Kota", "Tarogong", "Wanaraja", "Leles"] },
      { city: "Sumedang", districts: ["Sumedang Utara", "Sumedang Selatan", "Cimalaka", "Jatinangor"] },
      { city: "Subang", districts: ["Subang", "Pagaden", "Pamanukan"] },
      { city: "Indramayu", districts: ["Indramayu", "Jatibarang", "Haurgeulis"] },
      { city: "Kuningan", districts: ["Kuningan", "Ciawigebang", "Cidahu"] },
      { city: "Pangandaran", districts: ["Pangandaran", "Parigi", "Cijulang"] },
      { city: "Banjar", districts: ["Banjar", "Purwaharja", "Langensari"] },
    ],
  },
  {
    province: "Jawa Tengah",
    cities: [
      { city: "Semarang", districts: ["Semarang Tengah", "Semarang Utara", "Semarang Timur", "Semarang Selatan", "Semarang Barat", "Banyumanik", "Tembalang", "Candisari", "Gajahmungkur", "Pedurungan", "Genuk", "Gayamsari"] },
      { city: "Surakarta", districts: ["Laweyan", "Serengan", "Pasar Kliwon", "Jebres", "Banjarsari"] },
      { city: "Magelang", districts: ["Magelang Selatan", "Magelang Utara", "Bandongan"] },
      { city: "Salatiga", districts: ["Sidorejo", "Tingkir", "Argomulyo"] },
      { city: "Pekalongan", districts: ["Pekalongan Timur", "Pekalongan Barat", "Pekalongan Selatan", "Pekalongan Utara"] },
      { city: "Tegal", districts: ["Tegal Barat", "Tegal Timur", "Margadana"] },
      { city: "Cilacap", districts: ["Cilacap Selatan", "Cilacap Tengah", "Cilacap Utara", "Kroya"] },
      { city: "Banyumas", districts: ["Purwokerto Selatan", "Purwokerto Utara", "Purwokerto Timur", "Purwokerto Barat", "Sokaraja"] },
      { city: "Klaten", districts: ["Klaten Selatan", "Klaten Utara", "Cawas", "Delanggu", "Wedi"] },
      { city: "Sragen", districts: ["Sragen", "Kedawung", "Gemolong"] },
      { city: "Karanganyar", districts: ["Karanganyar", "Tasikmadu", "Colomadu", "Jaten"] },
      { city: "Sukoharjo", districts: ["Sukoharjo", "Baki", "Grogol", "Kartasura"] },
      { city: "Wonogiri", districts: ["Wonogiri", "Selogiri", "Ngadirojo"] },
      { city: "Boyolali", districts: ["Boyolali", "Sawit", "Cepogo"] },
      { city: "Purworejo", districts: ["Purworejo", "Bayan", "Banyuurip"] },
      { city: "Kebumen", districts: ["Kebumen", "Gombong"] },
      { city: "Blora", districts: ["Blora", "Cepu", "Jepon"] },
      { city: "Rembang", districts: ["Rembang", "Lasem", "Sedan"] },
      { city: "Pati", districts: ["Pati", "Juwana", "Margorejo"] },
      { city: "Kudus", districts: ["Kudus", "Jati", "Undaan"] },
      { city: "Jepara", districts: ["Jepara", "Keling", "Mayong"] },
      { city: "Demak", districts: ["Demak", "Mranggen", "Karangawen"] },
      { city: "Kendal", districts: ["Kendal", "Weleri", "Cepiring"] },
      { city: "Temanggung", districts: ["Temanggung", "Parakan", "Kledung"] },
      { city: "Wonosobo", districts: ["Wonosobo", "Kertek", "Kalikajar"] },
      { city: "Batang", districts: ["Batang", "Gringsing", "Subah"] },
      { city: "Purbalingga", districts: ["Purbalingga", "Bobotsari", "Kaligondang"] },
      { city: "Banjarnegara", districts: ["Banjarnegara", "Purwanegara", "Mandiraja"] },
    ],
  },
  {
    province: "Jawa Timur",
    cities: [
      { city: "Surabaya", districts: ["Genteng", "Tegalsari", "Gubeng", "Wonokromo", "Rungkut", "Tenggilis Mejoyo", "Gunung Anyar", "Sukolilo", "Mulyorejo", "Kenjeran", "Semampir", "Krembangan", "Bubutan", "Tandes", "Sambikerep", "Lakarsantri", "Benowo", "Sawahan", "Wonocolo", "Karang Pilang", "Jambangan", "Wiyung"] },
      { city: "Malang", districts: ["Blimbing", "Kedungkandang", "Sukun", "Lowokwaru", "Klojen"] },
      { city: "Sidoarjo", districts: ["Sidoarjo", "Waru", "Taman", "Candi", "Porong", "Gedangan", "Buduran"] },
      { city: "Gresik", districts: ["Gresik", "Manyar", "Cerme", "Kebomas", "Driyorejo"] },
      { city: "Mojokerto", districts: ["Mojokerto", "Prajurit Kulon", "Magersari"] },
      { city: "Pasuruan", districts: ["Pasuruan", "Bangil", "Pandaan", "Gadingrejo"] },
      { city: "Probolinggo", districts: ["Probolinggo", "Kanigaran", "Wonoasih"] },
      { city: "Kediri", districts: ["Kediri", "Pesantren", "Mojoroto"] },
      { city: "Blitar", districts: ["Blitar", "Sananwetan", "Sukorejo"] },
      { city: "Jember", districts: ["Jember", "Patrang", "Kaliwates", "Sumbersari"] },
      { city: "Banyuwangi", districts: ["Banyuwangi", "Giri", "Rogojampi", "Glagah"] },
      { city: "Jombang", districts: ["Jombang", "Diwek", "Peterongan"] },
      { city: "Madiun", districts: ["Madiun", "Manguharjo", "Taman"] },
      { city: "Ngawi", districts: ["Ngawi", "Paron", "Kedunggalar"] },
      { city: "Tulungagung", districts: ["Tulungagung", "Kedungwaru", "Ngunut"] },
      { city: "Ponorogo", districts: ["Ponorogo", "Babadan", "Jetis"] },
      { city: "Bojonegoro", districts: ["Bojonegoro", "Trucuk", "Kapas"] },
      { city: "Tuban", districts: ["Tuban", "Jatirogo", "Rengel"] },
      { city: "Lamongan", districts: ["Lamongan", "Babat", "Deket"] },
      { city: "Bangkalan", districts: ["Bangkalan", "Kamal", "Burneh"] },
      { city: "Sampang", districts: ["Sampang", "Kedungdung", "Camplong"] },
      { city: "Pamekasan", districts: ["Pamekasan", "Proppo", "Tlanakan"] },
      { city: "Sumenep", districts: ["Sumenep", "Kota Sumenep", "Guluk-Guluk"] },
    ],
  },
  {
    province: "Banten",
    cities: [
      { city: "Tangerang", districts: ["Tangerang", "Cibodas", "Karawaci", "Benda", "Neglasari", "Periuk", "Cipondoh", "Larangan", "Ciledug", "Karang Tengah", "Pinang", "Jatiuwung"] },
      { city: "Tangerang Selatan", districts: ["Serpong", "Ciputat", "Pondok Aren", "Pamulang", "Setu", "Ciputat Timur", "Serpong Utara"] },
      { city: "Serang", districts: ["Serang", "Cipocok Jaya", "Walantaka", "Kasemen", "Tirtayasa"] },
      { city: "Cilegon", districts: ["Cilegon", "Citangkil", "Purwakarta", "Pulo Merak", "Gerogol"] },
      { city: "Lebak", districts: ["Rangkasbitung", "Warunggunung", "Cibadak"] },
      { city: "Pandeglang", districts: ["Pandeglang", "Labuan", "Cadasari"] },
    ],
  },
  {
    province: "Bali",
    cities: [
      { city: "Denpasar", districts: ["Denpasar Utara", "Denpasar Selatan", "Denpasar Timur", "Denpasar Barat"] },
      { city: "Badung", districts: ["Kuta", "Kuta Utara", "Kuta Selatan", "Mengwi", "Abiansemal", "Petang"] },
      { city: "Gianyar", districts: ["Gianyar", "Ubud", "Sukawati", "Blahbatuh", "Tampaksiring"] },
      { city: "Tabanan", districts: ["Tabanan", "Kediri", "Baturiti", "Penebel"] },
      { city: "Buleleng", districts: ["Singaraja", "Banjar", "Buleleng", "Seririt"] },
      { city: "Karangasem", districts: ["Amlapura", "Manggis", "Rendang", "Sidemen"] },
      { city: "Klungkung", districts: ["Semarapura", "Banjarangkan", "Dawan"] },
      { city: "Jembrana", districts: ["Negara", "Mendoyo", "Pekutatan"] },
      { city: "Bangli", districts: ["Bangli", "Tembuku", "Susut"] },
    ],
  },
  {
    province: "Sumatera Utara",
    cities: [
      { city: "Medan", districts: ["Medan Barat", "Medan Timur", "Medan Selatan", "Medan Utara", "Medan Kota", "Medan Amplas", "Medan Denai", "Medan Helvetia", "Medan Tuntungan", "Medan Johor", "Medan Polonia", "Medan Sunggal", "Medan Marelan", "Medan Labuhan", "Medan Belawan", "Medan Perjuangan", "Medan Tembung", "Medan Area", "Medan Maimun"] },
      { city: "Binjai", districts: ["Binjai Utara", "Binjai Selatan", "Binjai Timur", "Binjai Barat", "Binjai Kota"] },
      { city: "Pematangsiantar", districts: ["Siantar Utara", "Siantar Selatan", "Siantar Timur", "Siantar Barat"] },
      { city: "Tebing Tinggi", districts: ["Tebing Tinggi", "Padang Hulu", "Bajenis"] },
      { city: "Padangsidempuan", districts: ["Padangsidempuan Utara", "Padangsidempuan Selatan"] },
      { city: "Sibolga", districts: ["Sibolga Utara", "Sibolga Selatan", "Sibolga Kota"] },
      { city: "Deli Serdang", districts: ["Lubuk Pakam", "Beringin", "Percut Sei Tuan", "Sunggal"] },
      { city: "Karo", districts: ["Kabanjahe", "Berastagi", "Merek"] },
      { city: "Simalungun", districts: ["Raya", "Pematang Raya", "Sidamanik"] },
      { city: "Asahan", districts: ["Kisaran", "Kota Kisaran Timur", "Kota Kisaran Barat"] },
      { city: "Labuhanbatu", districts: ["Rantau Prapat", "Bilah Hulu", "Bilah Hilir"] },
      { city: "Langkat", districts: ["Stabat", "Binjai", "Babalan"] },
      { city: "Tapanuli Utara", districts: ["Tarutung", "Siborong-Borong", "Pahae Jae"] },
      { city: "Tapanuli Selatan", districts: ["Sipirok", "Batang Toru"] },
      { city: "Nias", districts: ["Gunungsitoli", "Lotu", "Teluk Dalam"] },
      { city: "Dairi", districts: ["Sidikalang", "Parongil", "Sitinjo"] },
      { city: "Toba", districts: ["Balige", "Borbor", "Habinsaran"] },
      { city: "Samosir", districts: ["Pangururan", "Onan Runggu", "Nainggolan"] },
    ],
  },
  {
    province: "Sumatera Barat",
    cities: [
      { city: "Padang", districts: ["Padang Utara", "Padang Selatan", "Padang Timur", "Padang Barat", "Koto Tangah", "Lubuk Begalung", "Lubuk Kilangan", "Nanggalo", "Pauh"] },
      { city: "Bukittinggi", districts: ["Guguk Panjang", "Aur Birugo Tigo Baleh", "Mandiangin Koto Selayan"] },
      { city: "Padang Panjang", districts: ["Padang Panjang Timur", "Padang Panjang Barat"] },
      { city: "Payakumbuh", districts: ["Payakumbuh Barat", "Payakumbuh Timur"] },
      { city: "Solok", districts: ["Solok Selatan", "Solok Utara", "Lubuk Sikarah"] },
      { city: "Pariaman", districts: ["Pariaman Tengah", "Pariaman Selatan", "Pariaman Utara", "Pariaman Timur"] },
      { city: "Agam", districts: ["Lubuk Basung", "Canduang", "Matur"] },
      { city: "Tanah Datar", districts: ["Batusangkar", "Lima Kaum", "Rambatan"] },
      { city: "Pasaman", districts: ["Lubuk Sikaping", "Bonjol"] },
      { city: "Pasaman Barat", districts: ["Simpang Ampek", "Lembah Melintang", "Talamau"] },
      { city: "Mentawai", districts: ["Tuapejat", "Sikakap", "Siberut Selatan"] },
    ],
  },
  {
    province: "Riau",
    cities: [
      { city: "Pekanbaru", districts: ["Pekanbaru Kota", "Lima Puluh", "Bukit Raya", "Marpoyan Damai", "Tenayan Raya", "Tampan", "Sail", "Rumbai", "Rumbai Pesisir", "Payung Sekaki", "Kulim"] },
      { city: "Dumai", districts: ["Dumai Kota", "Bukit Kapur", "Medang Kampai", "Sungai Sembilan"] },
      { city: "Kampar", districts: ["Bangkinang", "Tapung", "Kampar Kiri"] },
      { city: "Rokan Hulu", districts: ["Pasir Pengaraian", "Ujung Batu", "Kepenuhan"] },
      { city: "Rokan Hilir", districts: ["Bagan Siapi-api", "Bangko", "Sinaboi"] },
      { city: "Siak", districts: ["Siak Sri Indrapura", "Tualang", "Minas"] },
      { city: "Pelalawan", districts: ["Pangkalan Kerinci", "Pangkalan Kuras", "Ukui"] },
      { city: "Indragiri Hulu", districts: ["Rengat", "Tembilahan", "Kuala Cenaku"] },
      { city: "Indragiri Hilir", districts: ["Tembilahan", "Tembilahan Hulu", "Kuala Indragiri"] },
      { city: "Kuantan Singingi", districts: ["Teluk Kuantan", "Cerenti", "Pangean"] },
    ],
  },
  {
    province: "Kepulauan Riau",
    cities: [
      { city: "Batam", districts: ["Batam Kota", "Lubuk Baja", "Sekupang", "Batu Aji", "Bengkong", "Batu Ampar", "Sagulung", "Sei Beduk", "Nongsa"] },
      { city: "Tanjung Pinang", districts: ["Tanjung Pinang Kota", "Tanjung Pinang Timur", "Bukit Bestari"] },
      { city: "Karimun", districts: ["Tanjung Balai Karimun", "Moro", "Meral"] },
      { city: "Bintan", districts: ["Bandar Seri Bentan", "Teluk Bintan", "Toapaya"] },
      { city: "Natuna", districts: ["Ranai", "Bunguran Timur", "Bunguran Barat"] },
      { city: "Lingga", districts: ["Daik", "Singkep", "Lingga Utara"] },
    ],
  },
  {
    province: "Jambi",
    cities: [
      { city: "Jambi", districts: ["Jambi Selatan", "Jambi Timur", "Jambi Utara", "Pasar Jambi", "Telanaipura", "Danau Teluk", "Pelayangan", "Kota Baru"] },
      { city: "Sungai Penuh", districts: ["Sungai Penuh", "Pondok Tinggi", "Koto Baru"] },
      { city: "Muaro Jambi", districts: ["Sengeti", "Sekernan", "Mestong"] },
      { city: "Batanghari", districts: ["Muara Bulian", "Maro Sebo", "Bajubang"] },
      { city: "Sarolangun", districts: ["Sarolangun", "Bathin VIII", "Pelawan"] },
      { city: "Merangin", districts: ["Bangko", "Tabir", "Jangkat"] },
      { city: "Kerinci", districts: ["Sungai Penuh", "Kayu Aro", "Sitinjau Laut"] },
      { city: "Bungo", districts: ["Muara Bungo", "Tanah Sepenggal", "Pelepat"] },
      { city: "Tebo", districts: ["Muara Tebo", "Rimbo Bujang", "Tebo Ilir"] },
    ],
  },
  {
    province: "Sumatera Selatan",
    cities: [
      { city: "Palembang", districts: ["Ilir Timur I", "Ilir Timur II", "Ilir Barat I", "Ilir Barat II", "Seberang Ulu I", "Seberang Ulu II", "Sukarami", "Kemuning", "Plaju", "Kertapati", "Gandus", "Alang-Alang Lebar", "Kalidoni"] },
      { city: "Prabumulih", districts: ["Prabumulih Timur", "Prabumulih Barat", "Cambai"] },
      { city: "Lubuklinggau", districts: ["Lubuklinggau Timur I", "Lubuklinggau Timur II", "Lubuklinggau Barat I", "Lubuklinggau Barat II"] },
      { city: "Pagar Alam", districts: ["Pagar Alam Utara", "Pagar Alam Selatan", "Dempo Utara", "Dempo Selatan"] },
      { city: "Muara Enim", districts: ["Muara Enim", "Gelumbang", "Lawang Kidul"] },
      { city: "Lahat", districts: ["Lahat", "Kota Agung", "Merapi"] },
      { city: "Ogan Ilir", districts: ["Indralaya", "Tanjung Raja", "Rantau Alai"] },
      { city: "Musi Banyuasin", districts: ["Sekayu", "Babat Toman", "Lais"] },
      { city: "Banyuasin", districts: ["Pangkalan Balai", "Betung", "Talang Kelapa"] },
    ],
  },
  {
    province: "Bengkulu",
    cities: [
      { city: "Bengkulu", districts: ["Gading Cempaka", "Ratu Agung", "Ratu Samban", "Kampung Melayu", "Teluk Segara", "Sungai Serut", "Muara Bangkahulu", "Selebar"] },
      { city: "Rejang Lebong", districts: ["Curup", "Bermani Ulu", "Selupu Rejang"] },
      { city: "Kepahiang", districts: ["Kepahiang", "Bermani Ilir", "Tebat Karai"] },
      { city: "Mukomuko", districts: ["Mukomuko", "Pondok Suguh", "Teramang Jaya"] },
      { city: "Kaur", districts: ["Bintuhan", "Kaur Selatan", "Kaur Utara"] },
      { city: "Bengkulu Utara", districts: ["Arga Makmur", "Kerkap", "Padang Jaya"] },
    ],
  },
  {
    province: "Lampung",
    cities: [
      { city: "Bandar Lampung", districts: ["Tanjung Karang Pusat", "Tanjung Karang Timur", "Rajabasa", "Kedaton", "Sukarame", "Kemiling", "Panjang", "Teluk Betung", "Enggal", "Bumi Waras", "Sukabumi", "Tanjung Senang", "Labuhan Ratu", "Way Halim", "Kedamaian"] },
      { city: "Metro", districts: ["Metro Pusat", "Metro Timur", "Metro Barat", "Metro Selatan", "Metro Utara"] },
      { city: "Lampung Selatan", districts: ["Kalianda", "Natar", "Jati Agung", "Candipuro"] },
      { city: "Lampung Utara", districts: ["Kotabumi", "Sungkai Selatan", "Abung Selatan"] },
      { city: "Lampung Tengah", districts: ["Gunung Sugih", "Terbanggi Besar", "Seputih Raman"] },
      { city: "Lampung Barat", districts: ["Liwa", "Sukau", "Belalau"] },
      { city: "Way Kanan", districts: ["Blambangan Umpu", "Pakuan Ratu", "Negeri Agung"] },
      { city: "Pesawaran", districts: ["Gedong Tataan", "Kedondong", "Negeri Katon"] },
      { city: "Pringsewu", districts: ["Pringsewu", "Gading Rejo", "Ambarawa"] },
      { city: "Tanggamus", districts: ["Kota Agung", "Gisting", "Talang Padang"] },
    ],
  },
  {
    province: "Daerah Istimewa Yogyakarta",
    cities: [
      { city: "Yogyakarta", districts: ["Gondokusuman", "Jetis", "Tegalrejo", "Danurejan", "Kraton", "Mantrijeron", "Kotagede", "Umbulharjo", "Ngampilan", "Wirobrajan"] },
      { city: "Sleman", districts: ["Sleman", "Depok", "Mlati", "Gamping", "Kalasan", "Berbah", "Prambanan", "Ngemplak", "Turi", "Minggir", "Seyegan", "Moyudan", "Cangkringan", "Tempel"] },
      { city: "Bantul", districts: ["Bantul", "Sewon", "Kasihan", "Imogiri", "Pajangan", "Pandak", "Bambanglipuro", "Sanden", "Kretek", "Pundong", "Dlingo", "Piyungan", "Jetis", "Srandakan"] },
      { city: "Kulon Progo", districts: ["Wates", "Sentolo", "Pengasih", "Kokap", "Temon", "Lendah", "Panjatan", "Galur", "Nanggulan", "Samigaluh", "Kalibawang", "Girimulyo"] },
      { city: "Gunungkidul", districts: ["Wonosari", "Playen", "Karangmojo", "Semin", "Panggang", "Saptosari", "Tepus", "Rongkop", "Ponjong", "Nglipar", "Girisubo"] },
    ],
  },
  {
    province: "Aceh",
    cities: [
      { city: "Banda Aceh", districts: ["Baiturrahman", "Banda Raya", "Jaya Baru", "Kuta Alam", "Lueng Bata", "Meuraxa", "Syiah Kuala", "Ulee Kareng", "Kuta Raja"] },
      { city: "Sabang", districts: ["Sukakarya", "Sukajaya", "Iboih"] },
      { city: "Lhokseumawe", districts: ["Banda Sakti", "Muara Dua", "Blang Mangat"] },
      { city: "Langsa", districts: ["Langsa Kota", "Langsa Barat", "Langsa Timur", "Langsa Lama"] },
      { city: "Subulussalam", districts: ["Simpang Kiri", "Penanggalan", "Rundeng"] },
      { city: "Aceh Besar", districts: ["Kuta Cot Glie", "Ingin Jaya", "Lhoong", "Indrapuri"] },
      { city: "Aceh Utara", districts: ["Lhoksukon", "Tanah Luas", "Nisam"] },
      { city: "Aceh Timur", districts: ["Idi Rayeuk", "Peureulak", "Darul Aman"] },
      { city: "Aceh Tengah", districts: ["Takengon", "Lut Tawar", "Bebesen"] },
      { city: "Aceh Selatan", districts: ["Tapak Tuan", "Kluet Utara", "Kluet Selatan"] },
      { city: "Aceh Barat", districts: ["Meulaboh", "Johan Pahlawan", "Samatiga"] },
      { city: "Aceh Tamiang", districts: ["Karang Baru", "Bendahara", "Manyak Payed"] },
      { city: "Pidie", districts: ["Sigli", "Kota Sigli", "Mila"] },
      { city: "Bireuen", districts: ["Bireuen", "Kota Juang", "Jeunieb"] },
      { city: "Gayo Lues", districts: ["Blang Kejeren", "Terangon", "Pining"] },
      { city: "Nagan Raya", districts: ["Suka Makmue", "Seunagan", "Kuala"] },
      { city: "Simeulue", districts: ["Sinabang", "Teupah Selatan", "Salang"] },
      { city: "Singkil", districts: ["Singkil", "Gunung Meriah", "Singkil Utara"] },
    ],
  },
  {
    province: "Kalimantan Barat",
    cities: [
      { city: "Pontianak", districts: ["Pontianak Kota", "Pontianak Timur", "Pontianak Barat", "Pontianak Selatan", "Pontianak Utara", "Pontianak Tenggara"] },
      { city: "Singkawang", districts: ["Singkawang Tengah", "Singkawang Utara", "Singkawang Selatan", "Singkawang Barat", "Singkawang Timur"] },
      { city: "Sambas", districts: ["Sambas", "Tebas", "Pemangkat"] },
      { city: "Bengkayang", districts: ["Bengkayang", "Sanggau Ledo", "Sungai Raya"] },
      { city: "Landak", districts: ["Ngabang", "Mandor", "Menjalin"] },
      { city: "Kubu Raya", districts: ["Sungai Raya", "Rasau Jaya", "Teluk Pakedai"] },
      { city: "Ketapang", districts: ["Ketapang", "Delta Pawan", "Benua Kayong"] },
      { city: "Sanggau", districts: ["Sanggau", "Kapuas", "Tayan Hulu"] },
      { city: "Sintang", districts: ["Sintang", "Kapuas", "Ketungau Hulu"] },
    ],
  },
  {
    province: "Kalimantan Tengah",
    cities: [
      { city: "Palangka Raya", districts: ["Pahandut", "Jekan Raya", "Bukit Batu", "Sabangau", "Rakumpit"] },
      { city: "Kotawaringin Barat", districts: ["Pangkalan Bun", "Kumai", "Arut Selatan"] },
      { city: "Kotawaringin Timur", districts: ["Sampit", "Cempaga", "Parensang"] },
      { city: "Kapuas", districts: ["Kuala Kapuas", "Selat", "Tamban Catur"] },
      { city: "Barito Utara", districts: ["Muara Teweh", "Gunung Timang", "Lahei"] },
      { city: "Barito Selatan", districts: ["Buntok", "Dusun Selatan", "Karau Kuala"] },
      { city: "Barito Timur", districts: ["Tamiang Layang", "Dusun Timur"] },
      { city: "Sukamara", districts: ["Sukamara", "Balai Riam", "Jelai"] },
      { city: "Lamandau", districts: ["Nanga Bulik", "Bulik", "Delang"] },
      { city: "Seruyan", districts: ["Kuala Pembuang", "Seruyan Hilir", "Danau Sembuluh"] },
      { city: "Katingan", districts: ["Kasongan", "Kamipang", "Tewang Sangalang"] },
      { city: "Gunung Mas", districts: ["Kuala Kurun", "Kurun", "Mihing Raya"] },
      { city: "Murung Raya", districts: ["Puruk Cahu", "Tanah Siang", "Laung Tuhup"] },
      { city: "Pulang Pisau", districts: ["Pulang Pisau", "Kahayan Hilir", "Maliku"] },
    ],
  },
  {
    province: "Kalimantan Selatan",
    cities: [
      { city: "Banjarmasin", districts: ["Banjarmasin Tengah", "Banjarmasin Utara", "Banjarmasin Selatan", "Banjarmasin Barat", "Banjarmasin Timur"] },
      { city: "Banjarbaru", districts: ["Banjarbaru Utara", "Banjarbaru Selatan", "Cempaka", "Liang Anggang"] },
      { city: "Banjar", districts: ["Martapura", "Astambul", "Simpang Empat"] },
      { city: "Tapin", districts: ["Rantau", "Bungur", "Candi Laras"] },
      { city: "Hulu Sungai Selatan", districts: ["Kandangan", "Daha Selatan", "Daha Utara"] },
      { city: "Hulu Sungai Tengah", districts: ["Barabai", "Batang Alai Selatan", "Batang Alai Utara"] },
      { city: "Hulu Sungai Utara", districts: ["Amuntai", "Babirik", "Danau Panggang"] },
      { city: "Tabalong", districts: ["Tanjung", "Murung Pudak", "Tanta"] },
      { city: "Tanah Laut", districts: ["Pelaihari", "Kurau", "Bati-Bati"] },
      { city: "Tanah Bumbu", districts: ["Batu Licin", "Simpang Empat", "Kusan Hilir"] },
      { city: "Kotabaru", districts: ["Kotabaru", "Pulau Laut Utara", "Pulau Laut Selatan"] },
      { city: "Balangan", districts: ["Paringin", "Juai", "Lampihong"] },
    ],
  },
  {
    province: "Kalimantan Timur",
    cities: [
      { city: "Samarinda", districts: ["Samarinda Kota", "Samarinda Ulu", "Samarinda Ilir", "Samarinda Seberang", "Samarinda Utara", "Samarinda Barat", "Sungai Pinang", "Palaran", "Loa Janan Ilir", "Sambutan"] },
      { city: "Balikpapan", districts: ["Balikpapan Kota", "Balikpapan Timur", "Balikpapan Barat", "Balikpapan Selatan", "Balikpapan Utara", "Balikpapan Tengah"] },
      { city: "Bontang", districts: ["Bontang Utara", "Bontang Selatan", "Bontang Barat"] },
      { city: "Kutai Kartanegara", districts: ["Tenggarong", "Tenggarong Seberang", "Muara Badak", "Anggana", "Samboja"] },
      { city: "Kutai Timur", districts: ["Sangatta", "Sangatta Utara", "Sangatta Selatan", "Bengalon"] },
      { city: "Kutai Barat", districts: ["Sendawar", "Barong Tongkok", "Melak"] },
      { city: "Paser", districts: ["Tana Paser", "Long Ikis", "Kuaro"] },
      { city: "Penajam Paser Utara", districts: ["Penajam", "Waru", "Babulu"] },
      { city: "Berau", districts: ["Tanjung Redeb", "Talisayan", "Sambaliung"] },
    ],
  },
  {
    province: "Kalimantan Utara",
    cities: [
      { city: "Tarakan", districts: ["Tarakan Timur", "Tarakan Barat", "Tarakan Tengah", "Tarakan Utara"] },
      { city: "Nunukan", districts: ["Nunukan", "Sebatik", "Lumbis"] },
      { city: "Malinau", districts: ["Malinau Kota", "Malinau Barat", "Malinau Selatan"] },
      { city: "Bulungan", districts: ["Tanjung Selor", "Peso", "Tanjung Palas"] },
    ],
  },
  {
    province: "Sulawesi Utara",
    cities: [
      { city: "Manado", districts: ["Wenang", "Sario", "Tikala", "Wanea", "Malalayang", "Singkil", "Mapanget", "Paal Dua", "Tuminting", "Bunaken"] },
      { city: "Bitung", districts: ["Lembeh Utara", "Lembeh Selatan", "Maesa", "Matuari", "Girian"] },
      { city: "Tomohon", districts: ["Tomohon Utara", "Tomohon Selatan", "Tomohon Tengah", "Tomohon Barat", "Tomohon Timur"] },
      { city: "Kotamobagu", districts: ["Kotamobagu Utara", "Kotamobagu Selatan", "Kotamobagu Barat", "Kotamobagu Timur"] },
      { city: "Minahasa", districts: ["Tondano", "Kawangkoan", "Remboken"] },
      { city: "Minahasa Selatan", districts: ["Amurang", "Tumpaan", "Tenga"] },
      { city: "Minahasa Utara", districts: ["Airmadidi", "Kauditan", "Kalawat"] },
      { city: "Bolaang Mongondow", districts: ["Lolak", "Passi", "Bolaang"] },
      { city: "Sangihe", districts: ["Tahuna", "Manganitu", "Tabukan"] },
      { city: "Talaud", districts: ["Melonguane", "Lirung", "Kabaruan"] },
    ],
  },
  {
    province: "Sulawesi Tengah",
    cities: [
      { city: "Palu", districts: ["Palu Barat", "Palu Timur", "Palu Selatan", "Palu Utara", "Tatanga", "Mantikulore", "Ulujadi"] },
      { city: "Poso", districts: ["Poso Kota", "Poso Pesisir", "Lage"] },
      { city: "Toli-Toli", districts: ["Toli-Toli", "Baolan", "Dampal Selatan"] },
      { city: "Donggala", districts: ["Donggala", "Banawa", "Sindue"] },
      { city: "Parigi Moutong", districts: ["Parigi", "Moutong", "Kasimbar"] },
      { city: "Sigi", districts: ["Sigi Biromaru", "Palolo", "Dolo"] },
      { city: "Banggai", districts: ["Banggai", "Luwuk", "Pagimana"] },
      { city: "Tojo Una-Una", districts: ["Ampana", "Tojo", "Una-Una"] },
      { city: "Morowali", districts: ["Bungku", "Menui", "Wita Ponda"] },
      { city: "Morowali Utara", districts: ["Kolonodale", "Petasia", "Lembo"] },
    ],
  },
  {
    province: "Sulawesi Selatan",
    cities: [
      { city: "Makassar", districts: ["Makassar", "Mariso", "Ujung Pandang", "Wajo", "Bontoala", "Rappocini", "Tamalate", "Panakkukang", "Manggala", "Tallo", "Biringkanaya", "Tamalanrea", "Somba Opu"] },
      { city: "Parepare", districts: ["Bacukiki", "Ujung", "Soreang"] },
      { city: "Palopo", districts: ["Wara", "Wara Utara", "Wara Selatan", "Wara Timur", "Wara Barat"] },
      { city: "Bone", districts: ["Watampone", "Cenrana", "Tanjung"] },
      { city: "Maros", districts: ["Maros", "Turikale", "Mandai"] },
      { city: "Gowa", districts: ["Sungguminasa", "Somba Opu", "Pallangga"] },
      { city: "Takalar", districts: ["Pattallassang", "Mangara Bombang", "Polombangkeng"] },
      { city: "Jeneponto", districts: ["Bontosunggu", "Binamu", "Tamalatea"] },
      { city: "Bulukumba", districts: ["Ujung Bulu", "Gantarang", "Kindang"] },
      { city: "Wajo", districts: ["Sengkang", "Tempe", "Bola"] },
      { city: "Pinrang", districts: ["Watang Pinrang", "Mattiro Bulu", "Duampanua"] },
      { city: "Sinjai", districts: ["Sinjai Utara", "Sinjai Selatan", "Tellu Limpoe"] },
      { city: "Barru", districts: ["Barru", "Tanete Riaja", "Mallusetasi"] },
      { city: "Enrekang", districts: ["Enrekang", "Anggeraja", "Alla"] },
      { city: "Tana Toraja", districts: ["Makale", "Sangalla", "Rano"] },
      { city: "Toraja Utara", districts: ["Rantepao", "Sanggalangi", "Nanggala"] },
      { city: "Luwu", districts: ["Belopa", "Larompong", "Bua"] },
      { city: "Luwu Utara", districts: ["Masamba", "Sabbang", "Bone-Bone"] },
      { city: "Luwu Timur", districts: ["Malili", "Wotu", "Tomoni"] },
    ],
  },
  {
    province: "Sulawesi Tenggara",
    cities: [
      { city: "Kendari", districts: ["Kendari", "Kendari Barat", "Poasia", "Wua-Wua", "Abeli", "Mandonga", "Kadia", "Baruga"] },
      { city: "Bau-Bau", districts: ["Bau-Bau", "Murhum", "Wolio", "Sorawolio"] },
      { city: "Kolaka", districts: ["Kolaka", "Wundulako", "Pomalaa"] },
      { city: "Konawe", districts: ["Unaaha", "Sampara", "Pondidaha"] },
      { city: "Konawe Selatan", districts: ["Andoolo", "Palangga", "Baito"] },
      { city: "Muna", districts: ["Raha", "Katobu", "Lohia"] },
      { city: "Buton", districts: ["Pasarwajo", "Wolowa", "Lasalimu"] },
      { city: "Wakatobi", districts: ["Wangi-Wangi", "Kaledupa", "Tomia"] },
      { city: "Bombana", districts: ["Rumbia", "Kabaena", "Poleang"] },
    ],
  },
  {
    province: "Sulawesi Barat",
    cities: [
      { city: "Mamuju", districts: ["Mamuju", "Simboro", "Kalukku"] },
      { city: "Majene", districts: ["Majene", "Pamboang", "Tubo Sendana"] },
      { city: "Polewali Mandar", districts: ["Polewali", "Wonomulyo", "Tinambung"] },
      { city: "Mamasa", districts: ["Mamasa", "Tanduk Kalua", "Sesenapadang"] },
    ],
  },
  {
    province: "Gorontalo",
    cities: [
      { city: "Gorontalo", districts: ["Kota Barat", "Kota Timur", "Kota Selatan", "Kota Utara", "Dungingi", "Hulonthalangi", "Sipatana", "Kota Tengah"] },
      { city: "Boalemo", districts: ["Tilamuta", "Wonosari", "Paguyaman"] },
      { city: "Pohuwato", districts: ["Marisa", "Dulupi", "Popayato"] },
      { city: "Bone Bolango", districts: ["Suwawa", "Kabila", "Tapa"] },
      { city: "Gorontalo Utara", districts: ["Kwandang", "Atinggola", "Sumalata"] },
    ],
  },
  {
    province: "Maluku",
    cities: [
      { city: "Ambon", districts: ["Nusaniwe", "Sirimau", "Teluk Ambon", "Baguala", "Leitimur Selatan"] },
      { city: "Tual", districts: ["Tual", "Pulau Dullah", "Dullah Utara"] },
      { city: "Buru", districts: ["Namlea", "Waeapo", "Air Buaya"] },
      { city: "Seram Bagian Timur", districts: ["Bula", "Werinama", "Siwalalat"] },
      { city: "Seram Bagian Barat", districts: ["Kairatu", "Taniwel", "Kairatu Barat"] },
      { city: "Maluku Tengah", districts: ["Masohi", "Tehoru", "Saparua"] },
      { city: "Kepulauan Aru", districts: ["Dobo", "Aru Selatan", "Aru Utara"] },
      { city: "Maluku Tenggara", districts: ["Langgur", "Kei Kecil", "Manyeuw"] },
    ],
  },
  {
    province: "Maluku Utara",
    cities: [
      { city: "Ternate", districts: ["Ternate Utara", "Ternate Selatan", "Ternate Tengah", "Ternate Pulau"] },
      { city: "Tidore", districts: ["Tidore Utara", "Tidore Selatan", "Oba", "Oba Selatan"] },
      { city: "Halmahera Barat", districts: ["Jailolo", "Sahu", "Ibu"] },
      { city: "Halmahera Utara", districts: ["Tobelo", "Galela", "Kao"] },
      { city: "Halmahera Selatan", districts: ["Labuha", "Bacan", "Kayoa"] },
      { city: "Halmahera Timur", districts: ["Maba", "Wasile", "Buligai"] },
      { city: "Sula", districts: ["Sanana", "Mangoli", "Sula Besi"] },
    ],
  },
  {
    province: "Papua",
    cities: [
      { city: "Jayapura", districts: ["Jayapura Utara", "Jayapura Selatan", "Abepura", "Heram", "Muara Tami"] },
      { city: "Merauke", districts: ["Merauke", "Semangga", "Kurik"] },
      { city: "Nabire", districts: ["Nabire", "Teluk Kimi", "Yaro"] },
      { city: "Biak", districts: ["Biak Kota", "Samofa", "Yendidori"] },
      { city: "Yapen", districts: ["Serui", "Anso", "Yapen Selatan"] },
      { city: "Waropen", districts: ["Botawa", "Wapoga"] },
      { city: "Keerom", districts: ["Waris", "Arso", "Senggi"] },
      { city: "Sarmi", districts: ["Sarmi", "Bonggo", "Pantai Timur"] },
    ],
  },
  {
    province: "Papua Barat",
    cities: [
      { city: "Manokwari", districts: ["Manokwari", "Manokwari Barat", "Manokwari Timur", "Warmare"] },
      { city: "Sorong", districts: ["Sorong", "Sorong Timur", "Sorong Barat", "Klaurung"] },
      { city: "Fakfak", districts: ["Fakfak", "Kokas", "Karas"] },
      { city: "Kaimana", districts: ["Kaimana", "Teluk Arguni", "Kambrau"] },
      { city: "Raja Ampat", districts: ["Waisai", "Misool", "Salawati"] },
      { city: "Teluk Bintuni", districts: ["Bintuni", "Babo", "Moswaren"] },
      { city: "Teluk Wondama", districts: ["Rasiei", "Wasior", "Nikiwar"] },
      { city: "Maybrat", districts: ["Kumurkek", "Aifat", "Ayamaru"] },
      { city: "Tambrauw", districts: ["Fef", "Mubrani", "Kwoor"] },
    ],
  },
  {
    province: "Papua Selatan",
    cities: [
      { city: "Merauke", districts: ["Merauke", "Semangga", "Kurik", "Jagebob", "Sota"] },
      { city: "Mappi", districts: ["Kepi", "Assue", "Citak Mitak"] },
      { city: "Asmat", districts: ["Agats", "Atsy", "Pantai Kasuari"] },
      { city: "Boven Digoel", districts: ["Tanah Merah", "Mandobo", "Kouh"] },
    ],
  },
  {
    province: "Papua Tengah",
    cities: [
      { city: "Nabire", districts: ["Nabire", "Teluk Kimi", "Yaro"] },
      { city: "Paniai", districts: ["Enarotali", "Kebo", "Aweida"] },
      { city: "Dogiyai", districts: ["Kigamani", "Kamu", "Mapia"] },
      { city: "Mimika", districts: ["Mimika Barat", "Mimika Timur", "Mimika Tengah"] },
      { city: "Puncak", districts: ["Ilaga", "Sinak", "Leweng"] },
      { city: "Puncak Jaya", districts: ["Mulia", "Tingginambut", "Ilu"] },
    ],
  },
  {
    province: "Papua Pegunungan",
    cities: [
      { city: "Wamena", districts: ["Wamena", "Asologaima", "Hubikosi"] },
      { city: "Jayawijaya", districts: ["Wamena", "Asologaima", "Hubikosi"] },
      { city: "Lanny Jaya", districts: ["Tiom", "Makki", "Pirime"] },
      { city: "Tolikara", districts: ["Karageme", "Karubaga", "Bokondini"] },
      { city: "Nduga", districts: ["Kenyam", "Mugi", "Yigi"] },
      { city: "Pegunungan Bintang", districts: ["Oksibil", "Okbibab", "Borme"] },
    ],
  },
  {
    province: "Papua Barat Daya",
    cities: [
      { city: "Sorong", districts: ["Sorong", "Sorong Timur", "Sorong Barat"] },
      { city: "Raja Ampat", districts: ["Waisai", "Misool", "Salawati"] },
      { city: "Maybrat", districts: ["Kumurkek", "Aifat", "Ayamaru"] },
      { city: "Tambrauw", districts: ["Fef", "Mubrani", "Kwoor"] },
      { city: "Sorong Selatan", districts: ["Klamono", "Kokoda", "Inanwatan"] },
    ],
  },
]

// Helper functions
export function getProvinces(): string[] {
  return INDONESIA_LOCATIONS.map(p => p.province)
}

export function getCities(province: string): string[] {
  const prov = INDONESIA_LOCATIONS.find(p => p.province === province)
  return prov ? prov.cities.map(c => c.city) : []
}

export function getDistricts(province: string, city: string): string[] {
  const prov = INDONESIA_LOCATIONS.find(p => p.province === province)
  if (!prov) return []
  const c = prov.cities.find(c => c.city === city)
  return c ? c.districts : []
}

export function getRWOptions(): string[] {
  return Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0'))
}

export function getRTOptions(): string[] {
  return Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'))
}

export function getVillageSuggestions(district: string): string[] {
  if (!district) return []
  return [
    `${district} Utara`,
    `${district} Selatan`,
    `${district} Timur`,
    `${district} Barat`,
    `${district} Tengah`,
  ]
}

export const PROVINCE_COORDS: Record<string, [number, number]> = {
  "DKI Jakarta": [-6.2088, 106.8456],
  "Jawa Barat": [-6.9175, 107.6191],
  "Jawa Tengah": [-7.1500, 110.1400],
  "Jawa Timur": [-7.2500, 112.7500],
  "Banten": [-6.4000, 106.1500],
  "Bali": [-8.4095, 115.2922],
  "Sumatera Utara": [3.5952, 98.6722],
  "Sumatera Barat": [-0.9471, 100.4172],
  "Riau": [0.5071, 101.4478],
  "Kepulauan Riau": [-0.1795, 104.5087],
  "Jambi": [-1.6108, 103.6131],
  "Sumatera Selatan": [-3.3194, 103.9144],
  "Bengkulu": [-3.7928, 102.2608],
  "Lampung": [-4.5586, 105.4061],
  "Daerah Istimewa Yogyakarta": [-7.8754, 110.4263],
  "Aceh": [4.6951, 96.7494],
  "Kalimantan Barat": [-0.1326, 109.1450],
  "Kalimantan Tengah": [-2.2136, 113.9108],
  "Kalimantan Selatan": [-3.3194, 114.5908],
  "Kalimantan Timur": [-0.5022, 117.1536],
  "Kalimantan Utara": [3.2916, 117.6328],
  "Sulawesi Utara": [1.4748, 124.8431],
  "Sulawesi Tengah": [-1.4300, 121.4450],
  "Sulawesi Selatan": [-5.1477, 119.4327],
  "Sulawesi Tenggara": [-4.0000, 122.5000],
  "Sulawesi Barat": [-2.5000, 118.5000],
  "Gorontalo": [0.5414, 123.0218],
  "Maluku": [-3.6954, 128.1815],
  "Maluku Utara": [0.7833, 127.3667],
  "Papua": [-4.2699, 138.0804],
  "Papua Barat": [-1.2726, 133.1745],
  "Papua Selatan": [-8.0000, 140.5000],
  "Papua Tengah": [-4.0000, 136.0000],
  "Papua Pegunungan": [-4.0000, 138.5000],
  "Papua Barat Daya": [-1.5000, 132.0000],
};

export function getProvinceCoords(province: string): [number, number] | undefined {
  return PROVINCE_COORDS[province];
}

const PROVINCE_ALIASES: Record<string, string> = {
  "polda metro jaya": "DKI Jakarta",
  "polda dki jakarta": "DKI Jakarta",
  "metro jaya": "DKI Jakarta",
  "polda jawa barat": "Jawa Barat",
  "polda jawa tengah": "Jawa Tengah",
  "polda jawa timur": "Jawa Timur",
  "polda banten": "Banten",
  "polda sumatera utara": "Sumatera Utara",
  "polda sumatera barat": "Sumatera Barat",
  "polda riau": "Riau",
  "polda kepulauan riau": "Kepulauan Riau",
  "polda jambi": "Jambi",
  "polda sumatera selatan": "Sumatera Selatan",
  "polda bengkulu": "Bengkulu",
  "polda lampung": "Lampung",
  "polda aceh": "Aceh",
  "polda di yogyakarta": "Daerah Istimewa Yogyakarta",
  "polda diy": "Daerah Istimewa Yogyakarta",
  "polda bali": "Bali",
  "poldakalimantan barat": "Kalimantan Barat",
  "polda kalimantan tengah": "Kalimantan Tengah",
  "polda kalimantan selatan": "Kalimantan Selatan",
  "polda kalimantan timur": "Kalimantan Timur",
  "polda kalimantan utara": "Kalimantan Utara",
  "polda sulawesi utara": "Sulawesi Utara",
  "polda sulawesi tengah": "Sulawesi Tengah",
  "polda sulawesi selatan": "Sulawesi Selatan",
  "polda sulawesi tenggara": "Sulawesi Tenggara",
  "polda sulawesi barat": "Sulawesi Barat",
  "polda gorontalo": "Gorontalo",
  "polda maluku": "Maluku",
  "polda maluku utara": "Maluku Utara",
  "polda papua": "Papua",
  "polda papua barat": "Papua Barat",
  "polda papua selatan": "Papua Selatan",
  "polda papua tengah": "Papua Tengah",
  "polda papua pegunungan": "Papua Pegunungan",
  "polda papua barat daya": "Papua Barat Daya",
};

export function normalizeProvince(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const lowered = trimmed.toLowerCase();

  if (PROVINCE_ALIASES[lowered]) return PROVINCE_ALIASES[lowered];

  const withoutPrefix = lowered.replace(/^polda\s+/, '');
  if (PROVINCE_ALIASES[withoutPrefix]) return PROVINCE_ALIASES[withoutPrefix];

  for (const key of Object.keys(PROVINCE_COORDS)) {
    if (lowered === key.toLowerCase()) return key;
  }

  for (const key of Object.keys(PROVINCE_COORDS)) {
    if (withoutPrefix === key.toLowerCase()) return key;
  }

  return trimmed;
}