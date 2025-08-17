import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useCreateTestMutation } from '../hooks/quizMutations';
import { LegacyQuestion } from '../contexts/TestContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

function TestCreation() {
  const { user } = useUser();
  const createTestMutation = useCreateTestMutation();
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: true
  });

  const [questions, setQuestions] = useState<LegacyQuestion[]>([
    {
      id: '1',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleTestDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTestData({
      ...testData,
      [e.target.name]: e.target.value
    });
  };

  const handleQuestionChange = (questionIndex: number, field: string, value: string) => {
    const updatedQuestions = questions.map((q: LegacyQuestion, index: number) => {
      if (index === questionIndex) {
        if (field === 'question') {
          return { ...q, question: value };
        }
      }
      return q;
    });
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = questions.map((q: LegacyQuestion, index: number) => {
      if (index === questionIndex) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    });
    setQuestions(updatedQuestions);
  };

  const handleCorrectAnswerChange = (questionIndex: number, correctAnswer: number) => {
    const updatedQuestions = questions.map((q: LegacyQuestion, index: number) => {
      if (index === questionIndex) {
        return { ...q, correctAnswer };
      }
      return q;
    });
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    const newQuestion: LegacyQuestion = {
      id: (questions.length + 1).toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionIndex: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, index) => index !== questionIndex));
    }
  };

  const generateWithAI = () => {
    // Simulate AI generation with sample questions
    const sampleQuestions: LegacyQuestion[] = [
      {
        id: Date.now().toString(),
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2
      },
      {
        id: (Date.now() + 1).toString(),
        question: "Which programming language is known for its use in web development?",
        options: ["Python", "JavaScript", "C++", "Java"],
        correctAnswer: 1
      },
      {
        id: (Date.now() + 2).toString(),
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1
      }
    ];

    setQuestions(sampleQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!testData.title || questions.some((q: LegacyQuestion) => !q.question || q.options.some((opt: string) => !opt))) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields'
      });
      return;
    }

    setLoading(true);

    try {
      await createTestMutation.mutateAsync({
        ...testData,
        questions,
        createdBy: user?.id || '',
        duration: parseInt(testData.duration.toString())
      });
      
      addToast({
        type: 'success',
        title: 'Test Created',
        message: 'Your test has been created successfully!'
      });
      
      navigate('/teacher');
    } catch (error: unknown) {
      console.error('Error creating test:', error);
      
      let errorMessage = 'Please check your database connection and try again.';
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'A test with this title already exists.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to create tests.';
        } else {
          errorMessage = error.message;
        }
      }
      
      addToast({
        type: 'error',
        title: 'Failed to Create Test',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link
              to="/teacher"
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create New Test</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Test Information */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="test-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Test Title *
                </label>
                <input
                  id="test-title"
                  type="text"
                  name="title"
                  value={testData.title}
                  onChange={handleTestDataChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter test title"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={testData.description}
                  onChange={handleTestDataChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter test description"
                />
              </div>

              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <input
                  id="start-date"
                  type="datetime-local"
                  name="startDate"
                  value={testData.startDate}
                  onChange={handleTestDataChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  id="end-date"
                  type="datetime-local"
                  name="endDate"
                  value={testData.endDate}
                  onChange={handleTestDataChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  id="duration"
                  type="number"
                  name="duration"
                  value={testData.duration}
                  onChange={handleTestDataChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="isActive"
                  value={testData.isActive.toString()}
                  onChange={(e) => setTestData({ ...testData, isActive: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={generateWithAI}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((question: LegacyQuestion, questionIndex: number) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-900">Question {questionIndex + 1}</h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        aria-label={`Remove question ${questionIndex + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      value={question.question}
                      onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter your question"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {question.options.map((option: string, optionIndex: number) => (
                      <div key={optionIndex}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option {String.fromCharCode(65 + optionIndex)} *
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder={`Enter option ${String.fromCharCode(65 + optionIndex)}`}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label htmlFor={`correct-answer-${questionIndex}`} className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Answer *
                    </label>
                    <select
                      id={`correct-answer-${questionIndex}`}
                      value={question.correctAnswer}
                      onChange={(e) => handleCorrectAnswerChange(questionIndex, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    >
                      {question.options.map((_: string, index: number) => (
                        <option key={index} value={index}>
                          Option {String.fromCharCode(65 + index)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/teacher"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Test
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TestCreation;