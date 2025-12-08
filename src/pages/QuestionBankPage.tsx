import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen,
  Search,
  Plus,
  Edit2,
  Copy,
  Filter,
  Tag,
  CheckCircle,
  X
} from 'lucide-react';
import { useTest } from '../hooks/useTest';
import { LegacyTest } from '../contexts/TestContext';
import { getCachedUUIDFromClerkId } from '../lib/clerkUtils';
import { Skeleton } from '../components/Skeleton';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category?: string;
  sourceTestId: string;
  sourceTestTitle: string;
}

function QuestionBankPage() {
  const { user } = useUser();
  const { tests } = useTest();
  const [userUUID, setUserUUID] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        const uuid = await getCachedUUIDFromClerkId(user.id);
        setUserUUID(uuid);
      }
      setLoading(false);
    };
    init();
  }, [user?.id]);

  const myTests = useMemo(() => 
    tests.filter((test: LegacyTest) => test.createdBy === userUUID),
    [tests, userUUID]
  );

  // Extract all questions from tests
  const allQuestions: Question[] = useMemo(() => {
    const questions: Question[] = [];
    myTests.forEach((test: LegacyTest) => {
      test.questions.forEach((q, index) => {
        questions.push({
          id: `${test.id}-${index}`,
          text: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: 'General',
          sourceTestId: test.id,
          sourceTestTitle: test.title
        });
      });
    });
    return questions;
  }, [myTests]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allQuestions.map(q => q.category || 'Uncategorized'));
    return ['all', ...Array.from(cats)];
  }, [allQuestions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = [...allQuestions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(query) ||
        q.options.some(opt => opt.toLowerCase().includes(query))
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(q => q.category === filterCategory);
    }

    return filtered;
  }, [allQuestions, searchQuery, filterCategory]);

  // Stats
  const stats = useMemo(() => ({
    totalQuestions: allQuestions.length,
    totalCategories: categories.length - 1,
    totalTests: myTests.length,
    questionsSelected: selectedQuestions.size
  }), [allQuestions, categories, myTests, selectedQuestions]);

  const toggleQuestionSelection = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const selectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const copySelectedToClipboard = () => {
    const selected = filteredQuestions.filter(q => selectedQuestions.has(q.id));
    const text = selected.map((q, i) => 
      `${i + 1}. ${q.text}\n` +
      q.options.map((opt, j) => `   ${String.fromCharCode(65 + j)}. ${opt}${j === q.correctAnswer ? ' ✓' : ''}`).join('\n')
    ).join('\n\n');
    
    navigator.clipboard.writeText(text);
    alert('Questions copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      {/* Header */}
      <header className="bg-white dark:bg-dark-bg-secondary shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/teacher" 
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-dark-text-secondary" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
                  <BookOpen className="h-7 w-7 text-purple-600" />
                  Question Bank
                </h1>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  Manage and organize your test questions
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Question
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalQuestions}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Total Questions</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalCategories}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Categories</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalTests}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Source Tests</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Copy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.questionsSelected}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Selected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  title="Filter by category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary transition-colors"
              >
                {selectedQuestions.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedQuestions.size > 0 && (
                <button
                  onClick={copySelectedToClipboard}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Selected
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-300 dark:text-dark-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                No Questions Found
              </h3>
              <p className="text-gray-500 dark:text-dark-text-secondary max-w-md mx-auto">
                {allQuestions.length === 0 
                  ? "Create a test first to start building your question bank."
                  : "No questions match your search criteria. Try adjusting your filters."
                }
              </p>
              {allQuestions.length === 0 && (
                <Link
                  to="/teacher/create-test"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Create Test
                </Link>
              )}
            </div>
          ) : (
            filteredQuestions.map((question, index) => (
              <div 
                key={question.id}
                className={`bg-white dark:bg-dark-bg-secondary rounded-xl shadow-sm border transition-all ${
                  selectedQuestions.has(question.id) 
                    ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900' 
                    : 'border-gray-200 dark:border-dark-border'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleQuestionSelection(question.id)}
                      title={selectedQuestions.has(question.id) ? "Deselect question" : "Select question"}
                      className={`mt-1 flex-shrink-0 h-5 w-5 rounded border-2 transition-colors ${
                        selectedQuestions.has(question.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300 dark:border-dark-border hover:border-purple-400'
                      }`}
                    >
                      {selectedQuestions.has(question.id) && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </button>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          Q{index + 1}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-dark-bg-tertiary text-gray-600 dark:text-dark-text-secondary rounded">
                          {question.category}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                          from: {question.sourceTestTitle}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 dark:text-dark-text-primary font-medium mb-3">
                        {question.text}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              optIndex === question.correctAnswer
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-dark-bg-tertiary'
                            }`}
                          >
                            <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-sm font-medium ${
                              optIndex === question.correctAnswer
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 dark:bg-dark-bg-secondary text-gray-600 dark:text-dark-text-secondary'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className={`text-sm ${
                              optIndex === question.correctAnswer
                                ? 'text-green-700 dark:text-green-300 font-medium'
                                : 'text-gray-600 dark:text-dark-text-secondary'
                            }`}>
                              {option}
                            </span>
                            {optIndex === question.correctAnswer && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingQuestion(question)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit question"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${question.text}\n${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}\nAnswer: ${String.fromCharCode(65 + question.correctAnswer)}`
                          );
                        }}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Copy question"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        {filteredQuestions.length > 0 && (
          <div className="text-center text-sm text-gray-500 dark:text-dark-text-secondary py-4">
            Showing {filteredQuestions.length} of {allQuestions.length} questions
            {selectedQuestions.size > 0 && ` • ${selectedQuestions.size} selected`}
          </div>
        )}
      </main>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Edit Question
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
                title="Close modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Question Text
                </label>
                <textarea
                  id="questionText"
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  rows={3}
                  placeholder="Enter question text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary resize-none"
                />
              </div>
              {editingQuestion.options.map((option, index) => (
                <div key={index}>
                  <label htmlFor={`option-${index}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Option {String.fromCharCode(65 + index)}
                    {index === editingQuestion.correctAnswer && (
                      <span className="ml-2 text-green-600 dark:text-green-400">(Correct Answer)</span>
                    )}
                  </label>
                  <input
                    id={`option-${index}`}
                    type="text"
                    value={option}
                    placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options];
                      newOptions[index] = e.target.value;
                      setEditingQuestion({...editingQuestion, options: newOptions});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Correct Answer
                </label>
                <select
                  id="correctAnswer"
                  title="Select correct answer"
                  value={editingQuestion.correctAnswer}
                  onChange={(e) => setEditingQuestion({...editingQuestion, correctAnswer: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                >
                  {editingQuestion.options.map((_, index) => (
                    <option key={index} value={index}>
                      Option {String.fromCharCode(65 + index)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-500 dark:text-dark-text-secondary bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <strong>Note:</strong> Changes made here are for preview only. To permanently edit questions, 
                please edit the source test: <span className="font-medium">{editingQuestion.sourceTestTitle}</span>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <Link
                to={`/teacher/edit-test/${editingQuestion.sourceTestId}`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit in Test
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Add New Question
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
                title="Close modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-dark-text-secondary mx-auto mb-4" />
              <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
                To add new questions, create a new test or edit an existing one. 
                All questions will automatically appear in your Question Bank.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Link
                  to="/teacher/create-test"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Test
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionBankPage;
