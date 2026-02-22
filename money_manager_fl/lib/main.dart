import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

void main() {
  runApp(const MoneyManagerApp());
}

class MoneyManagerApp extends StatelessWidget {
  const MoneyManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Money Manager',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF10141C),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00B8A9),
          brightness: Brightness.dark,
        ),
      ),
      home: const AppRoot(),
    );
  }
}

class AppRoot extends StatefulWidget {
  const AppRoot({super.key});

  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  final api = ApiClient();
  bool loading = true;
  String? token;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final existing = await api.getToken();
    setState(() {
      token = existing;
      loading = false;
    });
  }

  Future<void> _onAuthenticated(String nextToken) async {
    await api.setToken(nextToken);
    setState(() => token = nextToken);
  }

  Future<void> _logout() async {
    await api.clearToken();
    setState(() => token = null);
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (token == null) {
      return AuthScreen(api: api, onAuthenticated: _onAuthenticated);
    }
    return HomeShell(api: api, onLogout: _logout);
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.api, required this.onAuthenticated});

  final ApiClient api;
  final Future<void> Function(String token) onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool registerMode = false;
  bool loading = false;
  String? error;

  Future<void> _submit() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final payload = registerMode
          ? await widget.api.register(email.text, password.text)
          : await widget.api.login(email.text, password.text);
      await widget.onAuthenticated(payload['token'] as String);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            color: const Color(0xFF171D28),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(registerMode ? 'Create account' : 'Sign in'),
                  const SizedBox(height: 16),
                  TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
                  const SizedBox(height: 12),
                  TextField(
                    controller: password,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Password'),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Colors.redAccent)),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: loading ? null : _submit,
                      child: Text(loading ? 'Please wait...' : (registerMode ? 'Register' : 'Login')),
                    ),
                  ),
                  TextButton(
                    onPressed: loading ? null : () => setState(() => registerMode = !registerMode),
                    child: Text(registerMode ? 'Already have an account?' : 'Need an account?'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.api, required this.onLogout});

  final ApiClient api;
  final Future<void> Function() onLogout;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(api: widget.api),
      AccountsScreen(api: widget.api),
      TransfersScreen(api: widget.api),
      CategoriesScreen(api: widget.api),
      SettingsScreen(onLogout: widget.onLogout),
    ];
    return Scaffold(
      body: screens[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Accounts'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'Transfers'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), label: 'Categories'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
        ],
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  TransactionFilter filter = TransactionFilter();
  List<dynamic> transactions = [];
  bool loading = true;
  String? error;
  bool expenseMode = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.api.listTransactions(
        type: expenseMode ? 'EXPENSE' : 'INCOME',
        filter: filter,
      );
      setState(() => transactions = data);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = <String, double>{};
    for (final item in transactions) {
      final key = (item['category']?['name'] ?? 'Other').toString();
      totals[key] = (totals[key] ?? 0) + (item['amount'] as num).toDouble();
    }
    return SafeArea(
      child: Scaffold(
        appBar: AppBar(title: const Text('Money Manager')),
        floatingActionButton: FloatingActionButton(
          onPressed: () => Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => AddTransactionScreen(api: widget.api)))
              .then((_) => _load()),
          child: const Icon(Icons.add),
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: true, label: Text('EXPENSES')),
                  ButtonSegment(value: false, label: Text('INCOME')),
                ],
                selected: {expenseMode},
                onSelectionChanged: (value) {
                  setState(() => expenseMode = value.first);
                  _load();
                },
              ),
              const SizedBox(height: 12),
              PeriodSelector(
                filter: filter,
                onChange: (next) {
                  setState(() => filter = next);
                  _load();
                },
              ),
              const SizedBox(height: 12),
              if (loading) const Expanded(child: Center(child: CircularProgressIndicator())),
              if (error != null && !loading) Expanded(child: Center(child: Text(error!))),
              if (!loading && error == null)
                Expanded(
                  child: ListView(
                    children: [
                      Card(
                        color: const Color(0xFF171D28),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              SizedBox(
                                height: 180,
                                child: CategoryDonut(data: totals),
                              ),
                              const SizedBox(height: 8),
                              ...totals.entries.map(
                                (e) => ListTile(
                                  dense: true,
                                  title: Text(e.key),
                                  trailing: Text(e.value.toStringAsFixed(2)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...transactions.map(
                        (item) => Card(
                          color: const Color(0xFF171D28),
                          child: ListTile(
                            title: Text(item['category']?['name']?.toString() ?? 'Category'),
                            subtitle: Text(
                              '${item['account']?['name'] ?? ''} • ${DateFormat.yMMMd().format(DateTime.parse(item['occurredAt'].toString()))}',
                            ),
                            trailing: Text((item['amount'] as num).toStringAsFixed(2)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class AccountsScreen extends StatelessWidget {
  const AccountsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: api.listAccounts(),
      builder: (context, snap) {
        final data = snap.data ?? [];
        final total = data.fold<double>(0, (sum, row) => sum + (row['balance'] as num).toDouble());
        return Scaffold(
          appBar: AppBar(title: const Text('Accounts')),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Card(
                  color: const Color(0xFF171D28),
                  child: ListTile(
                    title: const Text('Total balance'),
                    trailing: Text(total.toStringAsFixed(2)),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: OutlinedButton(onPressed: () {}, child: const Text('Transfer history'))),
                    const SizedBox(width: 8),
                    Expanded(child: FilledButton(onPressed: () {}, child: const Text('New transfer'))),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    children: data
                        .map(
                          (row) => Card(
                            color: const Color(0xFF171D28),
                            child: ListTile(
                              leading: const Icon(Icons.account_balance_wallet_outlined),
                              title: Text(row['name'].toString()),
                              trailing: Text((row['balance'] as num).toStringAsFixed(2)),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class TransfersScreen extends StatelessWidget {
  const TransfersScreen({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: api.listTransfers(TransactionFilter()),
      builder: (context, snap) {
        final data = snap.data ?? [];
        return Scaffold(
          appBar: AppBar(title: const Text('Transfers')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: data
                .map(
                  (row) => Card(
                    color: const Color(0xFF171D28),
                    child: ListTile(
                      title: Text('${row['fromAccount']?['name']} -> ${row['toAccount']?['name']}'),
                      subtitle: Text(DateFormat.yMMMd().format(DateTime.parse(row['occurredAt'].toString()))),
                      trailing: Text((row['amount'] as num).toStringAsFixed(2)),
                    ),
                  ),
                )
                .toList(),
          ),
        );
      },
    );
  }
}

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  bool expenseMode = true;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: widget.api.listCategories(expenseMode ? 'EXPENSE' : 'INCOME'),
      builder: (context, snap) {
        final data = snap.data ?? [];
        return Scaffold(
          appBar: AppBar(title: const Text('Categories')),
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                SegmentedButton<bool>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: true, label: Text('EXPENSES')),
                    ButtonSegment(value: false, label: Text('INCOME')),
                  ],
                  selected: {expenseMode},
                  onSelectionChanged: (value) => setState(() => expenseMode = value.first),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: GridView.count(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    children: [
                      ...data.map(
                        (row) => Card(
                          color: const Color(0xFF171D28),
                          child: Center(child: Text(row['name'].toString())),
                        ),
                      ),
                      Card(
                        color: const Color(0xFF1D3342),
                        child: InkWell(
                          onTap: () {},
                          child: const Center(child: Text('Create')),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, required this.onLogout});
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Center(
        child: FilledButton(
          onPressed: onLogout,
          child: const Text('Logout'),
        ),
      ),
    );
  }
}

class AddTransactionScreen extends StatefulWidget {
  const AddTransactionScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  final amount = TextEditingController();
  final comment = TextEditingController();
  String type = 'EXPENSE';
  String? accountId;
  String? categoryId;
  DateTime date = DateTime.now();
  bool saving = false;
  String? receiptUrl;

  Future<void> _pickAndUpload() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    final url = await widget.api.uploadReceipt(File(picked.path));
    setState(() => receiptUrl = url);
  }

  Future<void> _save() async {
    if (accountId == null || categoryId == null) return;
    setState(() => saving = true);
    try {
      await widget.api.createTransaction(
        accountId: accountId!,
        categoryId: categoryId!,
        type: type,
        amount: double.parse(amount.text),
        occurredAt: date.toIso8601String(),
        comment: comment.text,
        receiptUrl: receiptUrl,
      );
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add transaction')),
      body: FutureBuilder<Map<String, List<dynamic>>>(
        future: widget.api.getCreateReferences(type),
        builder: (context, snap) {
          final accounts = snap.data?['accounts'] ?? [];
          final categories = snap.data?['categories'] ?? [];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              DropdownButtonFormField<String>(
                initialValue: type,
                items: const [
                  DropdownMenuItem(value: 'EXPENSE', child: Text('Expense')),
                  DropdownMenuItem(value: 'INCOME', child: Text('Income')),
                ],
                onChanged: (v) => setState(() {
                  type = v ?? 'EXPENSE';
                  categoryId = null;
                }),
                decoration: const InputDecoration(labelText: 'Type'),
              ),
              const SizedBox(height: 8),
              TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: accountId,
                items: accounts
                    .map((row) => DropdownMenuItem<String>(value: row['id'].toString(), child: Text(row['name'].toString())))
                    .toList(),
                onChanged: (v) => setState(() => accountId = v),
                decoration: const InputDecoration(labelText: 'Account'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: categoryId,
                items: categories
                    .map((row) => DropdownMenuItem<String>(value: row['id'].toString(), child: Text(row['name'].toString())))
                    .toList(),
                onChanged: (v) => setState(() => categoryId = v),
                decoration: const InputDecoration(labelText: 'Category'),
              ),
              const SizedBox(height: 8),
              ListTile(
                title: const Text('Date'),
                subtitle: Text(DateFormat.yMMMd().format(date)),
                trailing: const Icon(Icons.calendar_today_outlined),
                onTap: () async {
                  final selected = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                  );
                  if (selected != null) {
                    setState(() => date = selected);
                  }
                },
              ),
              TextField(controller: comment, decoration: const InputDecoration(labelText: 'Comment')),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _pickAndUpload,
                child: Text(receiptUrl == null ? 'Upload receipt' : 'Receipt uploaded'),
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: saving ? null : _save, child: const Text('Save')),
            ],
          );
        },
      ),
    );
  }
}

class TransactionFilter {
  String range = 'DAY';
  DateTime anchor = DateTime.now();
  DateTime? from;
  DateTime? to;
}

class PeriodSelector extends StatelessWidget {
  const PeriodSelector({super.key, required this.filter, required this.onChange});
  final TransactionFilter filter;
  final ValueChanged<TransactionFilter> onChange;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Wrap(
          spacing: 6,
          children: ['DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM']
              .map(
                (range) => ChoiceChip(
                  label: Text(range),
                  selected: filter.range == range,
                  onSelected: (_) {
                    final next = TransactionFilter()
                      ..range = range
                      ..anchor = filter.anchor
                      ..from = filter.from
                      ..to = filter.to;
                    onChange(next);
                  },
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              onPressed: filter.range == 'CUSTOM'
                  ? null
                  : () {
                      final next = TransactionFilter()
                        ..range = filter.range
                        ..anchor = _moveAnchor(filter.anchor, filter.range, -1);
                      onChange(next);
                    },
              icon: const Icon(Icons.chevron_left),
            ),
            Text(_labelForFilter(filter)),
            IconButton(
              onPressed: filter.range == 'CUSTOM'
                  ? null
                  : () {
                      final next = TransactionFilter()
                        ..range = filter.range
                        ..anchor = _moveAnchor(filter.anchor, filter.range, 1);
                      onChange(next);
                    },
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
      ],
    );
  }

  DateTime _moveAnchor(DateTime current, String range, int delta) {
    switch (range) {
      case 'DAY':
        return current.add(Duration(days: delta));
      case 'WEEK':
        return current.add(Duration(days: 7 * delta));
      case 'MONTH':
        return DateTime(current.year, current.month + delta, current.day);
      case 'YEAR':
        return DateTime(current.year + delta, current.month, current.day);
      default:
        return current;
    }
  }

  String _labelForFilter(TransactionFilter f) {
    final d = DateFormat.yMMMd();
    if (f.range == 'DAY') return d.format(f.anchor);
    if (f.range == 'MONTH') return DateFormat.yMMMM().format(f.anchor);
    if (f.range == 'YEAR') return DateFormat.y().format(f.anchor);
    if (f.range == 'WEEK') {
      final start = f.anchor.subtract(Duration(days: (f.anchor.weekday + 6) % 7));
      final end = start.add(const Duration(days: 6));
      return '${d.format(start)} - ${d.format(end)}';
    }
    return 'Custom period';
  }
}

class CategoryDonut extends StatelessWidget {
  const CategoryDonut({super.key, required this.data});
  final Map<String, double> data;

  @override
  Widget build(BuildContext context) {
    final total = data.values.fold<double>(0, (a, b) => a + b);
    return CustomPaint(
      painter: DonutPainter(data.values.toList()),
      child: Center(child: Text(total.toStringAsFixed(2))),
    );
  }
}

class DonutPainter extends CustomPainter {
  DonutPainter(this.values);
  final List<double> values;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 8;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final total = values.fold<double>(0, (a, b) => a + b);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 22
      ..strokeCap = StrokeCap.round;
    final colors = [
      const Color(0xFF00B8A9),
      const Color(0xFF56CCF2),
      const Color(0xFFF2C94C),
      const Color(0xFFEB5757),
      const Color(0xFFBB6BD9),
    ];
    double start = -math.pi / 2;
    if (total <= 0) {
      paint.color = Colors.white24;
      canvas.drawArc(rect, 0, 2 * math.pi, false, paint);
      return;
    }
    for (var i = 0; i < values.length; i++) {
      final sweep = (values[i] / total) * 2 * math.pi;
      paint.color = colors[i % colors.length];
      canvas.drawArc(rect, start, sweep, false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant DonutPainter oldDelegate) {
    return oldDelegate.values != values;
  }
}

class ApiClient {
  static const baseUrl = 'http://localhost:3000';
  final _storage = const FlutterSecureStorage();
  String? _token;

  Future<String?> getToken() async {
    _token ??= await _storage.read(key: 'token');
    return _token;
  }

  Future<void> setToken(String token) async {
    _token = token;
    await _storage.write(key: 'token', value: token);
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'token');
  }

  Future<Map<String, dynamic>> register(String email, String password) async {
    return _unwrap(await _request('POST', '/auth/register', body: {
      'email': email,
      'password': password,
    }));
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    return _unwrap(await _request('POST', '/auth/login', body: {
      'email': email,
      'password': password,
    }));
  }

  Future<List<dynamic>> listAccounts() async {
    return _unwrap(await _request('GET', '/accounts')) as List<dynamic>;
  }

  Future<List<dynamic>> listCategories(String type) async {
    return _unwrap(await _request('GET', '/categories?type=$type')) as List<dynamic>;
  }

  Future<List<dynamic>> listTransactions({
    required String type,
    required TransactionFilter filter,
  }) async {
    final uri = '/transactions?type=$type&range=${filter.range}&date=${DateFormat('yyyy-MM-dd').format(filter.anchor)}';
    return _unwrap(await _request('GET', uri)) as List<dynamic>;
  }

  Future<List<dynamic>> listTransfers(TransactionFilter filter) async {
    final uri = '/transfers?range=${filter.range}&date=${DateFormat('yyyy-MM-dd').format(filter.anchor)}';
    return _unwrap(await _request('GET', uri)) as List<dynamic>;
  }

  Future<Map<String, List<dynamic>>> getCreateReferences(String type) async {
    final accounts = await listAccounts();
    final categories = await listCategories(type);
    return {'accounts': accounts, 'categories': categories};
  }

  Future<void> createTransaction({
    required String accountId,
    required String categoryId,
    required String type,
    required double amount,
    required String occurredAt,
    String? comment,
    String? receiptUrl,
  }) async {
    await _request('POST', '/transactions', body: {
      'accountId': accountId,
      'categoryId': categoryId,
      'type': type,
      'amount': amount,
      'occurredAt': occurredAt,
      'comment': comment,
      'receiptUrl': receiptUrl,
    });
  }

  Future<String> uploadReceipt(File file) async {
    final token = await getToken();
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/uploads/receipt'));
    if (token != null) {
      req.headers['Authorization'] = 'Bearer $token';
    }
    req.files.add(await http.MultipartFile.fromPath('file', file.path));
    final response = await req.send();
    final payload = jsonDecode(await response.stream.bytesToString()) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'UPLOAD_ERROR');
    }
    return ((payload['data'] as Map<String, dynamic>)['receiptUrl']).toString();
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await getToken();
    final uri = Uri.parse('$baseUrl$path');
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    http.Response response;
    switch (method) {
      case 'POST':
        response = await http.post(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'PATCH':
        response = await http.patch(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        response = await http.get(uri, headers: headers);
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['error']?.toString() ?? 'REQUEST_ERROR');
    }
    return payload;
  }

  dynamic _unwrap(Map<String, dynamic> payload) => payload['data'];
}
